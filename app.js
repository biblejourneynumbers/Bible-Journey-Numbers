// ===== DOM refs =====
const statusEl    = document.getElementById('status');
const resultEl    = document.getElementById('result');
const refOut      = document.getElementById('refOut');
const verseText   = document.getElementById('verseText');
const numInput    = document.getElementById('numInput');
const resolveBtn  = document.getElementById('resolveBtn');
const saveBtn     = document.getElementById('saveBtn');
const exportBtn   = document.getElementById('exportBtn');
const journalList = document.getElementById('journalList');
const themesOut   = document.getElementById('themesOut');
const quickOut    = document.getElementById('quickOut');
const extendedOut = document.getElementById('extendedOut');
const alignOut    = document.getElementById('alignOut');
const prayerOut   = document.getElementById('prayerOut');
const translationSelect = document.getElementById('translation'); // <select id="translation">

// Bump this when you deploy to force browsers to fetch fresh files
const ASSET_VER = 'build-1';

// Cache for CSV rows: { asv: [...], fbv: [...], kjv: [...] }
let translationCache = {};

// Map dropdown value -> CSV filename (exactly as in your repo)
function csvUrlForTranslation(code) {
  switch ((code || '').toLowerCase()) {
    case 'asv': return 'FullNumbers_WithVerses_ASV Time Complete.csv?v=' + ASSET_VER;
    case 'fbv': return 'FullNumbers_WithVerses_FBV Time Complete.csv?v=' + ASSET_VER;
    case 'kjv': return 'Bible_Journey JKV Time complete.csv?v=' + ASSET_VER;
    default:    return 'FullNumbers_WithVerses_ASV Time Complete.csv?v=' + ASSET_VER;
  }
}

// Split a CSV line while respecting quotes
function splitCSV(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// Load CSV → array of row objects (headers are lowercased)
async function loadCsv(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = splitCSV(lines.shift()).map(h => h.trim().toLowerCase());
  return lines.map(line => {
    const cells = splitCSV(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));
    return row;
  });
}

// Lookup by Number directly from selected translation CSV
async function getVerseForNumber(number) {
  const code = (translationSelect?.value || 'kjv').toLowerCase();

  if (!translationCache[code]) {
    translationCache[code] = await loadCsv(csvUrlForTranslation(code));
  }
  const rows = translationCache[code];

  // headers are lowercased by loadCsv()
  const hit = rows.find(r => String(r['number']) === String(number));
  if (!hit) {
    return {
      ref: 'Not found',
      text: 'No verse text found for this number.',
      themes: '', quick: '', extended: '', align: '', prayer: ''
    };
  }

  const ref = hit['reference'] || '';
  const text =
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
  const n = numInput.value.trim();
  if (!n) {
    statusEl.textContent = 'Enter a number.';
    return;
  }

  statusEl.textContent = 'Loading verse…';
  resultEl.classList.remove('hidden');
  refOut.textContent = '';
  verseText.textContent = '…';

try {
  const { ref, text, themes, quick, extended, align, prayer } = await getVerseForNumber(n);

  refOut.textContent      = ref;
  verseText.textContent   = text;
  themesOut.textContent   = themes;
  quickOut.textContent    = quick;
  extendedOut.textContent = extended;
  alignOut.textContent    = align;
  prayerOut.textContent   = prayer;

  statusEl.textContent = text ? '' : 'No verse text found.';
} catch (e) {
  console.error(e);
  statusEl.textContent = 'Error loading verse. Check file names and headers.';
  verseText.textContent = '';
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
  if (!list.length) {
    journalList.innerHTML = '<p class="muted">No entries yet.</p>';
    return;
  }
  for (const item of list) {
    const div = document.createElement('div');
    div.className = 'journal-item';
    const dt = new Date(item.date).toLocaleString();
    div.innerHTML = `<strong>${dt}</strong> — #${item.number}<br>
    <em>Themes:</em> ${item.themes || ''}<br>
    <em>Reflection:</em> ${item.reflection || ''}`;
    journalList.appendChild(div);
  }
}

function saveEntry() {
  const n = numInput.value.trim();
  const ref = refOut.textContent || '';
  if (!n || !ref) return;

  const themes = document.getElementById('themes')?.value.trim() || '';
  const reflection = document.getElementById('reflection')?.value.trim() || '';
  const src = [...document.querySelectorAll('input[name="sourceType"]')]
                .find(r => r.checked)?.value || 'Manual';

  const raw = localStorage.getItem('bj_journal') || '[]';
  const list = JSON.parse(raw);
  list.unshift({
    date: new Date().toISOString(),
    number: n,
    reference: ref,
    themes,
    reflection,
    sourceType: src
  });
  localStorage.setItem('bj_journal', JSON.stringify(list));
  renderJournal(list);
  statusEl.textContent = 'Saved to Journal (local on this device).';
}

function exportJSON() {
  const raw = localStorage.getItem('bj_journal') || '[]';
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bible_journey_journal.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* =========================
 *  Events & init
 * ========================= */
resolveBtn?.addEventListener('click', resolveNumber);
saveBtn?.addEventListener('click', saveEntry);
exportBtn?.addEventListener('click', exportJSON);

// Auto-refresh result when translation changes
translationSelect?.addEventListener('change', () => {
  if (!resultEl.classList.contains('hidden')) resolveNumber();
});

// Init journal only (no journey_map anymore)
loadJournal();




