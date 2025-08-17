let mapping = new Map();
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const refOut = document.getElementById('refOut');
const verseText = document.getElementById('verseText');
const numInput = document.getElementById('numInput');
const resolveBtn = document.getElementById('resolveBtn');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');
const journalList = document.getElementById('journalList');

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
  const numIdx = cols.indexOf('number');
  const refIdx = cols.indexOf('reference');
  const reasonIdx = cols.indexOf('reason');

  for (const line of lines) {
    const parts = splitCSV(line);
    if (!parts.length) continue;
    const num = (parts[numIdx] || '').trim();
    const ref = (parts[refIdx] || '').trim();
    const reason = (parts[reasonIdx] || '').trim();
    if (num && ref) mapping.set(num, { ref, reason });
  }
}

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

function resolveNumber() {
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
  statusEl.textContent = '';
  refOut.textContent = hit.ref;
  verseText.textContent = 'KJV/CSB text will be added soon. For now, verify in your Bible.';
  resultEl.classList.remove('hidden');
}

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
  const themes = document.getElementById('themes').value.trim();
  const reflection = document.getElementById('reflection').value.trim();
  const src = [...document.querySelectorAll('input[name="sourceType"]')].find(r => r.checked)?.value || 'Manual';

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

resolveBtn.addEventListener('click', resolveNumber);
saveBtn.addEventListener('click', saveEntry);
exportBtn.addEventListener('click', exportJSON);

loadMapping();
loadJournal();
