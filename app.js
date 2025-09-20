// ===== DOM refs =====
let mapping = new Map();
const statusEl    = document.getElementById('status');
const resultEl    = document.getElementById('result');
const refOut      = document.getElementById('refOut');
const verseText   = document.getElementById('verseText');
const numInput    = document.getElementById('numInput');
const resolveBtn  = document.getElementById('resolveBtn');
const saveBtn     = document.getElementById('saveBtn');
const exportBtn   = document.getElementById('exportBtn');
const journalList = document.getElementById('journalList');
const translationSelect = document.getElementById('translation'); // <select id="translation">

// Cache for translation CSV rows: { asv: [...], fbv: [...], kjv: [...] }
let translationCache = {};

/* =========================
 *  Mapping (journey_map.csv)
 * ========================= */
async function loadMapping() {
  statusEl.textContent = 'Loading mapping…';
  try {
    const res = await fetch('journey_map.csv', { cache: 'no-store' });
    const txt = await res.text();
    parseCSV(txt);
    statusEl.textContent = `Loaded ${mapping.size} mappings.`;
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Could not load mapping file.';
  }
}

function parseCSV(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  const cols = header.split(',').map(s => s.trim().toLowerCase());
  const numIdx    = cols.indexOf('number');
  const refIdx    = cols.indexOf('reference');
  const reasonIdx = cols.indexOf('reason');

  for (const line of lines) {
    const parts = splitCSV(line);
    if (!parts.length) continue;
    const num    = (parts[numIdx] || '').trim();
    const ref    = (parts[refIdx] || '').trim();
    const reason = (parts[reasonIdx] || '').trim();
    if (num && ref) mapping.set(num, { ref, reason });
  }
}

// CSV line splitter that respects simple quotes
function splitCSV(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\"') {
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

/* =========================
 *  Translation CSV loading
 * ========================= */
function csvUrlForTranslation(code) {
  switch ((code || '').toLowerCase()) {
    case 'asv': return 'FullNumbers_WithVerses_ASV Time Complete.csv';
    case 'fbv': return 'FullNumbers_WithVerses_FBV Time Complete.csv';
    case 'kjv': return 'Bible_Journey JKV Time complete.csv';
    default:    return 'FullNumbers_WithVerses_ASV Time Complete.csv';
  }
}

// Load CSV → array<rowObject> using the same splitter
async function loadCsv(url) {
  const res = await fetch(url, { cache: 'no-store' });
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

// Return verse text (and fallback ref) for a number from the selected translation
async function getVerseTextFromTranslation(number) {
  const code = (translationSelect?.value || 'asv').toLowerCase();

  if (!translationCache[code]) {
    translationCache[code] = await loadCsv(csvUrlForTranslation(code));
  }
  const rows = translationCache[code];

  // Expected columns (adjust here if your CSV headers differ):
  // number, book, chapter, verse, verse_text
  const hit = rows.find(r => String(r.number) === String(number));
  if (!hit) return { text: '', builtRef: '' };

  const text = hit.verse_text || hit.verse || '';
  const builtRef =
    hit.book && hit.chapter && hit.verse ? `${hit.book} ${hit.chapter}:${hit.verse}` : '';

  return { text, builtRef };
}

/* =========================
 *  Resolve flow
 * ========================= */
async function resolveNumber() {
  const n = numInput.value.trim();
  if (!n) {
    statusEl.textContent = 'Enter a number.';
    return;
  }
  const hit = mapping.get(n);
  if (!hit) {
    statusEl.textContent = 'No mapping found yet. Add it to journey_map.csv later.';
    resultEl.classList.add('hidden');
    return;
  }

  // Show reference immediately from mapping; then load verse text from translation
  statusEl.textContent = 'Loading verse…';
  refOut.textContent = hit.ref;
  verseText.textContent = '…';
  resultEl.classList.remove('hidden');

  try {
    const { text, builtRef } = await getVerseTextFromTranslation(n);
    if (!hit.ref && builtRef) refOut.textContent = builtRef; // fallback if mapping had no ref
    verseText.textContent = text || 'No verse text found in selected translation.';
    statusEl.textContent = '';
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Error loading verse text.';
    verseText.textContent = 'KJV/CSB text will be added soon. For now, verify in your Bible.';
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
    div.innerHTML = `<strong>${dt}</strong> — #${item.number} (${item.sourceType}) → ${item.reference}<br>
    <em>Themes:</em> ${item.themes || ''}<br>
    <em>Reflection:</em> ${item.reflection || ''}`;
    journalList.appendChild(div);
  }
}

function saveEntry() {
  const n = numInput.value.trim();
  const hit = mapping.get(n);
  if (!hit) return;
  const themes = document.getElementById('themes')?.value.trim() || '';
  const reflection = document.getElementById('reflection')?.value.trim() || '';
  const src = [...document.querySelectorAll('input[name="sourceType"]')]
                .find(r => r.checked)?.value || 'Manual';

  const raw = localStorage.getItem('bj_journal') || '[]';
  const list = JSON.parse(raw);
  list.unshift({
    date: new Date().toISOString(),
    number: n,
    reference: hit.ref,
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

// If the user switches translation, refresh current result (if visible)
translationSelect?.addEventListener('change', () => {
  if (!resultEl.classList.contains('hidden')) resolveNumber();
});

// Kickoff
loadMapping();
loadJournal();

