// ===== DOM refs =====
const statusEl    = document.getElementById('status');
const resultEl    = document.getElementById('result');
const refOut      = document.getElementById('refOut');
const verseText   = document.getElementById('verseText');
const numInput    = document.getElementById('numInput');
const resolveBtn  = document.getElementById('resolveBtn');
const saveBtn     = document.getElementById('saveBtn');
const journalList = document.getElementById('journalList');
const themesOut   = document.getElementById('themesOut');
const quickOut    = document.getElementById('quickOut');
const extendedOut = document.getElementById('extendedOut');
const alignOut    = document.getElementById('alignOut');
const prayerOut   = document.getElementById('prayerOut');
const translationSelect = document.getElementById('translation');

saveBtn.disabled = true; // only enable after a successful resolve

// ===== Cache-busting =====
const ASSET_VER = 'build-7';

// ===== CSV cache =====
let translationCache = {}; // { asv: rows[], web: rows[], kjv: rows[] }

// ----- Helper: normalize numbers so "001", "1 ", "1" all match
function normalizeNumber(val) {
  const s = String(val ?? '').trim();
  if (s === '') return '';
  const digitsOnly = s.replace(/[^\d]/g, '');
  if (digitsOnly === '') return '';
  return String(parseInt(digitsOnly, 10));
}

// ----- Helper: candidate filenames (only the ones you actually use)
function candidateFilesForTranslation(code) {
  const c = (code || '').toLowerCase();
  if (c === 'asv') return ['FullNumbers_WithVerses_ASV Time Complete.csv'];
  if (c === 'web') return ['Bible_Journey_Number_Map_Time_WEB.csv'];
  // KJV (keep both spellings present in repo)
  return ['Bible_Journey JKV Time complete.csv', 'Bible_Journey KJV Time Complete.csv'];
}

async function fetchFirstAvailable(candidates) {
  let lastErr;
  const tried = [];
  for (const name of candidates) {
    const url = encodeURI(name + '?v=' + ASSET_VER);
    tried.push(name);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && text.trim().length) {
        return { text, name };
      }
    } catch (e) {
      lastErr = e;
    }
  }
  const err = new Error('No CSV found');
  err.tried = tried;
  err.cause = lastErr;
  throw err;
}

// --- Robust CSV parser that handles commas, quotes, and newlines inside quotes
function parseCsvRaw(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      row.push(field); field = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row);
      row = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function parseCsvText(text) {
  const matrix = parseCsvRaw(text).filter(r => r && r.some(c => String(c).trim() !== ''));
  if (!matrix.length) return [];
  const headers = matrix.shift().map(h => String(h).trim().toLowerCase());
  return matrix.map(cells => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = String(cells[i] ?? '').trim()));
    return obj;
  });
}

// ----- Load CSV for a translation
async function ensureCsvLoaded(code) {
  const k = (code || 'kjv').toLowerCase();
  if (!translationCache[k]) {
    statusEl.textContent = 'Loading translation data…';
    let payload;
    try {
      payload = await fetchFirstAvailable(candidateFilesForTranslation(k));
    } catch (e) {
      console.error(e);
      statusEl.textContent = `Could not load ${k.toUpperCase()} CSV. Tried: ${e.tried?.join(' | ') || 'n/a'}.`;
      throw e;
    }
    translationCache[k] = parseCsvText(payload.text);
    statusEl.textContent = `Loaded ${translationCache[k].length} rows from "${payload.name}".`;
  }
  return translationCache[k];
}

// ----- Core lookup
async function getVerseForNumber(number) {
  const code = (translationSelect?.value || 'kjv').toLowerCase();
  const rows = await ensureCsvLoaded(code);

  const target = normalizeNumber(number);
  const hit = rows.find(r => normalizeNumber(r['number']) === target);
  if (!hit) {
    return { ref: 'Not found', text: 'No verse text found for this number in the selected translation.',
             themes: '', quick: '', extended: '', align: '', prayer: '' };
  }

  const ref = hit['reference'] || '';
  const text =
    hit['verse_text (web)'] ||
    hit['verse_text (kjv)'] ||
    hit['verse_text (asv)'] ||
    hit['verse_text (fbv)'] || '';

  return {
    ref,
    text,
    themes:   hit['themes'] || '',
    quick:    hit['quick reflection'] || '',
    extended: hit['extended reflection'] || '',
    align:    hit['alignment'] || '',
    prayer:   hit['prayer'] || ''
  };
}

// ===== Main resolve flow =====
async function resolveNumber() {
  const nRaw = numInput.value;
  const n = normalizeNumber(nRaw);
  if (!n) { statusEl.textContent = 'Enter a number (digits only).'; return; }

  statusEl.textContent = 'Resolving…';
  resultEl.classList.remove('hidden');
  refOut.textContent = ''; verseText.textContent = '…';
  themesOut.textContent = ''; quickOut.textContent = '';
  extendedOut.textContent = ''; alignOut.textContent = ''; prayerOut.textContent = '';

  try {
    const { ref, text, themes, quick, extended, align, prayer } = await getVerseForNumber(n);
    refOut.textContent = ref; verseText.textContent = text;
    themesOut.textContent = themes; quickOut.textContent = quick;
    extendedOut.textContent = extended; alignOut.textContent = align; prayerOut.textContent = prayer;

    const ok = Boolean(text && text.trim());
    statusEl.textContent = ok ? '' : 'No verse text found.';
    saveBtn.disabled = !ok;
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Error loading verse. Check file names and headers.';
    verseText.textContent = ''; saveBtn.disabled = true;
  }
}

/* =========================
 *  Journal (LocalStorage)
 * ========================= */
function loadJournal() {
  const raw = localStorage.getItem('bj_journal') || '[]';
  const list = JSON.parse(raw);
  renderJournal(list);
}

function renderJournal(list) {
  journalList.innerHTML = '';
  if (!list.length) { journalList.innerHTML = '<p class="muted">No entries yet.</p>'; return; }
  for (const item of list) {
    const div = document.createElement('div');
    div.className = 'journal-item';
    const dt = new Date(item.date).toLocaleString();

    div.innerHTML = `
      <strong>${dt}</strong> — #${item.number}${item.translation ? ' (' + item.translation + ')' : ''}<br>
      <em>Ref:</em> ${item.reference || ''}<br>
      <em>Verse:</em> ${item.verse || ''}<br>
      <em>Themes:</em> ${item.csvThemes || ''}<br>
      <em>Quick Reflection:</em> ${item.csvQuick || ''}<br>
      <em>Extended Reflection:</em> ${item.csvExtended || ''}<br>
      <em>Alignment:</em> ${item.csvAlign || ''}<br>
      <em>Prayer:</em> ${item.csvPrayer || ''}<br>
      <em>My Themes:</em> ${item.themes || ''}<br>
      <em>My Reflection:</em> ${item.reflection || ''}
    `;
    journalList.appendChild(div);
  }
}

async function saveEntry() {
  const nRaw = numInput.value;
  const n = normalizeNumber(nRaw);
  let ref = (refOut.textContent || '').trim();
  let verse = (verseText.textContent || '').trim();
  if (!n) { statusEl.textContent = 'Enter a number first.'; return; }

  let resolved;
  try {
    resolved = await getVerseForNumber(n);
    if (resolved?.ref) ref = ref || resolved.ref;
    if (resolved?.text) verse = verse || resolved.text;
  } catch (e) { console.error(e); }

  if (!ref || !verse) {
    statusEl.textContent = 'Resolve the number first (no verse text available).';
    saveBtn.disabled = true; return;
  }

  const myThemes = document.getElementById('themes')?.value.trim() || '';
  const myReflection = document.getElementById('reflection')?.value.trim() || '';
  const src = [...document.querySelectorAll('input[name="sourceType"]')].find(r => r.checked)?.value || 'Manual';
  const translation = (translationSelect?.value || '').toUpperCase();

  const raw = localStorage.getItem('bj_journal') || '[]';
  const list = JSON.parse(raw);
  list.unshift({
    date: new Date().toISOString(),
    number: n,
    reference: ref,
    verse,

    // CSV-sourced fields
    csvThemes:   resolved?.themes   || '',
    csvQuick:    resolved?.quick    || '',
    csvExtended: resolved?.extended || '',
    csvAlign:    resolved?.align    || '',
    csvPrayer:   resolved?.prayer   || '',

    // User-entered fields
    themes: myThemes,
    reflection: myReflection,

    sourceType: src,
    translation
  });
  localStorage.setItem('bj_journal', JSON.stringify(list));
  renderJournal(list);
  statusEl.textContent = 'Saved to Journal (local on this device).';
}

// ---- CSV export (Windows-friendly with BOM) ----
function toCsvValue(s) {
  if (s == null) return '';
  const t = String(s).replace(/"/g, '""');
  return /[",\n]/.test(t) ? `"${t}"` : t;
}

function exportCSV() {
  const raw  = localStorage.getItem('bj_journal') || '[]';
  const rows = JSON.parse(raw);

  const headers = [
    'Date','Number','Reference','Verse',
    'Themes','Quick Reflection','Extended Reflection','Alignment','Prayer',
    'My Themes','My Reflection','Source','Translation'
  ];
  const lines = [headers.join(',')];

  for (const r of rows) {
    const local = new Date(r.date).toLocaleString();
    lines.push([
      toCsvValue(local),
      toCsvValue(r.number),
      toCsvValue(r.reference),
      toCsvValue(r.verse || ''),
      toCsvValue(r.csvThemes || ''),
      toCsvValue(r.csvQuick || ''),
      toCsvValue(r.csvExtended || ''),
      toCsvValue(r.csvAlign || ''),
      toCsvValue(r.csvPrayer || ''),
      toCsvValue(r.themes || ''),
      toCsvValue(r.reflection || ''),
      toCsvValue(r.sourceType || ''),
      toCsvValue(r.translation || '')
    ].join(','));
  }

  const csv = '\uFEFF' + lines.join('\r\n'); // Excel-friendly
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bible_journey_journal.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Markdown export (nice for UpNote/Notion/Obsidian)
function mdBlock(label, val) {
  const v = (val || '').trim();
  return v ? `**${label}:** ${v}\n` : '';
}

function exportMarkdown() {
  const raw  = localStorage.getItem('bj_journal') || '[]';
  const rows = JSON.parse(raw);

  const lines = ['# My Bible Journey Journal\n'];

  if (!rows.length) {
    lines.push('_No entries yet. Use **Save Entry** in My Journal, then export again._\n');
  } else {
    for (const r of rows) {
      const local = new Date(r.date).toLocaleString();

      lines.push(
`${r.reference || '—'} — #${r.number}${r.translation ? ' (' + r.translation + ')' : ''}
${mdBlock('Date', local)}${mdBlock('Verse', r.verse)}

${mdBlock('Themes', r.csvThemes)}${mdBlock('Quick Reflection', r.csvQuick)}${mdBlock('Extended Reflection', r.csvExtended)}${mdBlock('Alignment', r.csvAlign)}${mdBlock('Prayer', r.csvPrayer)}

${mdBlock('My Themes', r.themes)}${mdBlock('My Reflection', r.reflection)}${mdBlock('Source', r.sourceType)}${mdBlock('Translation', r.translation)}
---
`
      );
    }
  }

  const md = lines.join('');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bible_journey_journal.md';
  a.click();
  URL.revokeObjectURL(url);
}


// ---- Clear all entries ----
function clearJournal() {
  if (!confirm('This will permanently delete all saved journal entries on this device. Continue?')) return;
  localStorage.removeItem('bj_journal');
  renderJournal([]);
  statusEl.textContent = 'Journal cleared on this device.';
}

/* =========================
 *  Events & init
 * ========================= */
resolveBtn?.addEventListener('click', resolveNumber);
saveBtn?.addEventListener('click', saveEntry);

const exportCsvBtn = document.getElementById('exportCsvBtn');
exportCsvBtn?.addEventListener('click', exportCSV);

const exportMdBtn = document.getElementById('exportMdBtn');
exportMdBtn?.addEventListener('click', exportMarkdown);

const clearBtn = document.getElementById('clearBtn');
clearBtn?.addEventListener('click', clearJournal);

// Preload current translation on page load + when changed
(async () => { try { await ensureCsvLoaded(translationSelect?.value); } catch(e){ console.error(e); } })();
translationSelect?.addEventListener('change', async () => {
  statusEl.textContent = '';
  try { await ensureCsvLoaded(translationSelect.value); } catch(e){ console.error(e); }
  if (!resultEl.classList.contains('hidden')) resolveNumber();
});

// Init journal
loadJournal();
