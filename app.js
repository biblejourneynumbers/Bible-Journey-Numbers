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
const translationSelect = document.getElementById('translation'); // <select id="translation">

// Cache for CSV rows: { asv: [...], fbv: [...], kjv: [...] }
let translationCache = {};

function csvUrlForTranslation(code) {
  switch ((code || '').toLowerCase()) {
    case 'asv': return 'FullNumbers_WithVerses_ASV Time Complete.csv';
    case 'fbv': return 'FullNumbers_WithVerses_FBV Time Complete.csv';
    case 'kjv': return 'Bible_Journey JKV Time complete.csv';
    default:    return 'FullNumbers_WithVerses_ASV Time Complete.csv';
  }
}

// Split CSV line respecting quotes
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

// Load CSV → array of row objects
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

// Lookup verse for a given number
async function getVerseForNumber(number) {
  const code = (translationSelect?.value || 'asv').toLowerCase();
  if (!translationCache[code]) {
    translationCache[code] = await loadCsv(csvUrlForTranslation(code));
  }
  const rows = translationCache[code];

  // Adjust these names if needed based on your CSV headers
  const hit = rows.find(r => String(r.number) === String(number));
  if (!hit) return { ref: 'Not found', text: 'No verse text found.' };

  const ref = `${hit.book} ${hit.chapter}:${hit.verse}`;
  const text = hit.verse_text || hit.verse || '';
  return { ref, text };
}

// ===== Main resolve function =====
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
    const { ref, text } = await getVerseForNumber(n);
    refOut.textContent = ref;
    verseText.textContent = text;
    statusEl.textContent = '';
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Error loading verse.';
    verseText.textContent = 'Check your CSV headers or filenames.';
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

// If user switches translation, refresh current result
translationSelect?.addEventListener('change', () => {
  if (!resultEl.classList.contains('hidden')) resolveNumber();
});

// Init
loadJournal();



