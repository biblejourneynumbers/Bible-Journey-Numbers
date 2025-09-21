/* =========================
 * My Bible Journey – app.js (vanilla)
 * ========================= */

/* ---------- DOM refs ---------- */
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

/* Buttons inside "My Journal" */
const exportCsvBtn     = document.getElementById('exportCsvBtn');
const exportMdBtn      = document.getElementById('exportMdBtn');       // Export Markdown
const exportSocialBtn  = document.getElementById('exportSocialBtn');   // Copy for Social
const clearBtn         = document.getElementById('clearBtn');

/* ---------- Flags / Config ---------- */
saveBtn && (saveBtn.disabled = true);       // only enable after a successful resolve
const ASSET_VER = 'build-9';                 // cache-busting for CSV assets

/* Storage keys: new + legacy (auto-migrate on load) */
const STORAGE_KEY = 'bj_journal_v2';
const LEGACY_KEYS = ['bj_journal'];

/* In-memory translation CSV cache */
let translationCache = {}; // { asv: rows[], web: rows[], kjv: rows[] }

/* ---------- Utilities ---------- */
function setStatus(msg) { if (statusEl) statusEl.textContent = msg || ''; }

function normalizeNumber(val) {
  const s = String(val ?? '').trim();
  if (s === '') return '';
  const digitsOnly = s.replace(/[^\d]/g, '');
  if (digitsOnly === '') return '';
  return String(parseInt(digitsOnly, 10));
}

/* Candidate CSV filenames per translation */
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

/* Robust CSV parser */
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

async function ensureCsvLoaded(code) {
  const k = (code || 'kjv').toLowerCase();
  if (!translationCache[k]) {
    setStatus('Loading translation data…');
    let payload;
    try {
      payload = await fetchFirstAvailable(candidateFilesForTranslation(k));
    } catch (e) {
      console.error(e);
      setStatus(`Could not load ${k.toUpperCase()} CSV. Tried: ${e.tried?.join(' | ') || 'n/a'}.`);
      throw e;
    }
    translationCache[k] = parseCsvText(payload.text);
    setStatus(`Loaded ${translationCache[k].length} rows from "${payload.name}".`);
  }
  return translationCache[k];
}

/* ---------- Verse Lookup ---------- */
async function getVerseForNumber(number) {
  const code = (translationSelect?.value || 'kjv').toLowerCase();
  const rows = await ensureCsvLoaded(code);
  const target = normalizeNumber(number);

  // Header name variants we support
  const H = {
    number: 'number',
    reference: 'reference',
    verse_web: 'verse_text (web)',
    verse_kjv: 'verse_text (kjv)',
    verse_asv: 'verse_text (asv)',
    verse_fbv: 'verse_text (fbv)',
    themes: 'themes',
    quick: 'quick reflection',
    extended: 'extended reflection',
    align: 'alignment',
    prayer: 'prayer'
  };

  const hit = rows.find(r => normalizeNumber(r[H.number]) === target);
  if (!hit) {
    return { ref: 'Not found', text: 'No verse text found for this number in the selected translation.',
             themes: '', quick: '', extended: '', align: '', prayer: '' };
  }

  const ref = hit[H.reference] || '';
  const text = hit[H.verse_web] || hit[H.verse_kjv] || hit[H.verse_asv] || hit[H.verse_fbv] || '';

  return {
    ref,
    text,
    themes:   hit[H.themes]   || '',
    quick:    hit[H.quick]    || '',
    extended: hit[H.extended] || '',
    align:    hit[H.align]    || '',
    prayer:   hit[H.prayer]   || ''
  };
}

/* ---------- Resolve flow ---------- */
async function resolveNumber() {
  const nRaw = numInput?.value;
  const n = normalizeNumber(nRaw);
  if (!n) { setStatus('Enter a number (digits only).'); return; }

  setStatus('Resolving…');
  resultEl?.classList.remove('hidden');
  if (refOut) refOut.textContent = '';
  if (verseText) verseText.textContent = '…';
  if (themesOut) themesOut.textContent = '';
  if (quickOut) quickOut.textContent = '';
  if (extendedOut) extendedOut.textContent = '';
  if (alignOut) alignOut.textContent = '';
  if (prayerOut) prayerOut.textContent = '';

  try {
    const { ref, text, themes, quick, extended, align, prayer } = await getVerseForNumber(n);
    if (refOut) refOut.textContent = ref;
    if (verseText) verseText.textContent = text;
    if (themesOut) themesOut.textContent = themes;
    if (quickOut) quickOut.textContent = quick;
    if (extendedOut) extendedOut.textContent = extended;
    if (alignOut) alignOut.textContent = align;
    if (prayerOut) prayerOut.textContent = prayer;

    const ok = Boolean(text && text.trim());
    setStatus(ok ? '' : 'No verse text found.');
    if (saveBtn) saveBtn.disabled = !ok;
  } catch (e) {
    console.error(e);
    setStatus('Error loading verse. Check file names and headers.');
    if (verseText) verseText.textContent = '';
    if (saveBtn) saveBtn.disabled = true;
  }
}

/* =========================
 *  Journal (LocalStorage)
 * ========================= */
function migrateLegacy() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return; // already on v2
    for (const key of LEGACY_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        // Do NOT delete legacy automatically; user may rely on it in old builds
        break;
      }
    }
  } catch {}
}

function getJournal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '[]';
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setJournal(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  } catch {}
}

function loadJournal() {
  migrateLegacy();
  renderJournal(getJournal());
}

function renderJournal(list) {
  if (!journalList) return;
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
  const nRaw = numInput?.value;
  const n = normalizeNumber(nRaw);
  let ref = (refOut?.textContent || '').trim();
  let verse = (verseText?.textContent || '').trim();
  if (!n) { setStatus('Enter a number first.'); return; }

  let resolved;
  try {
    resolved = await getVerseForNumber(n);
    if (resolved?.ref) ref = ref || resolved.ref;
    if (resolved?.text) verse = verse || resolved.text;
  } catch (e) { console.error(e); }

  if (!ref || !verse) {
    setStatus('Resolve the number first (no verse text available).');
    if (saveBtn) saveBtn.disabled = true; 
    return;
  }

  const myThemes = document.getElementById('themes')?.value.trim() || '';
  const myReflection = document.getElementById('reflection')?.value.trim() || '';
  const src = [...document.querySelectorAll('input[name="sourceType"]')].find(r => r.checked)?.value || 'Manual';
  const translation = (translationSelect?.value || '').toUpperCase();

  const list = getJournal();
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
  setJournal(list);
  renderJournal(list);
  setStatus('Saved to Journal (local on this device).');
}

/* ---------- CSV export (BOM for Excel) ---------- */
function toCsvValue(s) {
  if (s == null) return '';
  const t = String(s).replace(/"/g, '""');
  return /[",\n]/.test(t) ? `"${t}"` : t;
}

function exportCSV() {
  const rows = getJournal();

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

/* ---------- Markdown export (bold labels, no '---') ---------- */
function mdBlock(label, val) {
  const v = (val || '').trim();
  return v ? `**${label}:** ${v}\n` : '';
}

function exportMarkdown() {
  const rows = getJournal();
  const lines = ['# My Bible Journey Journal\n\n'];

  if (!rows.length) {
    lines.push('_No entries yet. Use **Save Entry** in My Journal, then export again._\n');
  } else {
    for (const r of rows) {
      const local = new Date(r.date).toLocaleString();
      const title = `${r.reference || '—'} — #${r.number}${r.translation ? ' (' + r.translation + ')' : ''}`;

      lines.push(
`${title}
${mdBlock('Date', local)}${mdBlock('Verse', r.verse)}
${mdBlock('Themes', r.csvThemes)}${mdBlock('Quick Reflection', r.csvQuick)}${mdBlock('Extended Reflection', r.csvExtended)}${mdBlock('Alignment', r.csvAlign)}${mdBlock('Prayer', r.csvPrayer)}
${mdBlock('My Themes', r.themes)}${mdBlock('My Reflection', r.reflection)}${mdBlock('Source', r.sourceType)}${mdBlock('Translation', r.translation)}
`
      );
      lines.push('\n'); // blank line between entries
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

/* ---------- Copy for Social (all entries, plain text) ---------- */
function exportSocial() {
  const rows = getJournal();
  if (!rows.length) {
    setStatus('No entries to share yet — save one first.');
    return;
  }

  const out = [];
  for (const r of rows) {
    const local = new Date(r.date).toLocaleString();
    const header = `${r.reference || '—'} — #${r.number}${r.translation ? ' (' + r.translation + ')' : ''}`;

    out.push(
`${header}
Date: ${local}
Verse: ${r.verse || ''}

Themes: ${r.csvThemes || ''}
Quick Reflection: ${r.csvQuick || ''}
Extended Reflection: ${r.csvExtended || ''}
Alignment: ${r.csvAlign || ''}
Prayer: ${r.csvPrayer || ''}

My Themes: ${r.themes || ''}
My Reflection: ${r.reflection || ''}
Source: ${r.sourceType || ''}

`
    );
  }

  const text = out.join('\n');
  (navigator.clipboard?.writeText(text))
    .then(() => setStatus('Copied all journal entries to your clipboard.'))
    .catch(() => {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bible_journey_all_entries.txt';
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Saved all entries as a text file (clipboard was blocked).');
    });
}

/* ---------- Clear all entries (robust) ---------- */
function clearJournal() {
  if (!confirm('This will permanently delete all saved journal entries on this device. Continue?')) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    // also clear legacy key(s) so older builds don’t rehydrate right away
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {}

  renderJournal([]);
  setStatus('Journal cleared on this device.');
}

/* =========================
 *  Events & init
 * ========================= */
resolveBtn?.addEventListener('click', resolveNumber);
saveBtn?.addEventListener('click', saveEntry);

exportCsvBtn?.addEventListener('click', exportCSV);
exportMdBtn?.addEventListener('click', exportMarkdown);
exportSocialBtn?.addEventListener('click', exportSocial);
clearBtn?.addEventListener('click', clearJournal);

/* Preload current translation on page load + when changed */
(async () => {
  try { await ensureCsvLoaded(translationSelect?.value); } catch (e) { console.error(e); }
})();
translationSelect?.addEventListener('change', async () => {
  setStatus('');
  try { await ensureCsvLoaded(translationSelect.value); } catch (e) { console.error(e); }
  if (!resultEl?.classList?.contains('hidden')) resolveNumber();
});

/* Init journal */
loadJournal();

/* Optional: Enter to resolve */
numInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') resolveNumber();
});
