'use strict';

const SECTION_KEY = 'sso.sections';
const SECTION_DEFS = [
  { id: 'folders', name: 'Kategori', desc: 'Folder kategori layanan' },
  { id: 'favorites', name: 'Favorit', desc: 'Layanan yang kamu bintangi' },
  { id: 'campus', name: 'Layanan kampus', desc: 'Daftar layanan dalam kategori' },
  { id: 'google', name: 'Google', desc: 'Gmail, Drive, Meet, Classroom' },
  { id: 'info', name: 'Info UNESA', desc: 'Kabar dan pengumuman' },
];

const list = document.getElementById('sectionList');
const resetBtn = document.getElementById('resetBtn');

let drag = null;

function read() {
  const defaults = SECTION_DEFS.map((def) => def.id);
  try {
    const raw = JSON.parse(localStorage.getItem(SECTION_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return { order: defaults, hidden: [] };
    const order = Array.isArray(raw.order) ? raw.order.filter((id) => defaults.includes(id)) : [];
    for (const id of defaults) {
      if (order.includes(id)) continue;
      const index = defaults.indexOf(id);
      order.splice(Math.min(index, order.length), 0, id);
    }
    const hidden = Array.isArray(raw.hidden) ? raw.hidden.filter((id) => defaults.includes(id)) : [];
    return { order, hidden };
  } catch {
    return { order: defaults, hidden: [] };
  }
}

function save(settings) {
  try {
    localStorage.setItem(SECTION_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

function currentOrder() {
  return [...list.querySelectorAll('.settings-row')].map((row) => row.dataset.section);
}

function currentHidden() {
  return [...list.querySelectorAll('.settings-row')]
    .filter((row) => !row.querySelector('input[type="checkbox"]').checked)
    .map((row) => row.dataset.section);
}

function persist() {
  save({ order: currentOrder(), hidden: currentHidden() });
}

function render() {
  const settings = read();
  list.replaceChildren();

  for (const id of settings.order) {
    const def = SECTION_DEFS.find((entry) => entry.id === id);
    if (!def) continue;

    const row = document.createElement('li');
    row.className = 'settings-row';
    row.dataset.section = id;
    row.innerHTML = `
      <button class="drag-handle" type="button" aria-label="Tarik untuk mengurutkan ${def.name}">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="6" cy="4" r="1.2" fill="currentColor"/><circle cx="10" cy="4" r="1.2" fill="currentColor"/>
          <circle cx="6" cy="8" r="1.2" fill="currentColor"/><circle cx="10" cy="8" r="1.2" fill="currentColor"/>
          <circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="10" cy="12" r="1.2" fill="currentColor"/>
        </svg>
      </button>
      <span class="settings-copy">
        <span class="settings-name"></span>
        <span class="settings-desc"></span>
      </span>
      <label class="switch">
        <input type="checkbox" aria-label="Tampilkan ${def.name}" ${settings.hidden.includes(id) ? '' : 'checked'}>
        <span class="switch-track"></span>
      </label>`;

    row.querySelector('.settings-name').textContent = def.name;
    row.querySelector('.settings-desc').textContent = def.desc;
    row.querySelector('input[type="checkbox"]').addEventListener('change', persist);
    list.appendChild(row);
  }
}

list.addEventListener('pointerdown', (event) => {
  const handle = event.target.closest('.drag-handle');
  if (!handle) return;
  const row = handle.closest('.settings-row');
  if (!row) return;

  drag = { row, pointerId: event.pointerId };
  row.classList.add('dragging');
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();
});

list.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;

  const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest('.settings-row');
  if (!hit || hit === drag.row || hit.parentElement !== list) return;

  const rect = hit.getBoundingClientRect();
  const after = event.clientY > rect.top + rect.height / 2;
  list.insertBefore(drag.row, after ? hit.nextSibling : hit);
});

function endDrag() {
  if (!drag) return;
  drag.row.classList.remove('dragging');
  drag = null;
  persist();
}

list.addEventListener('pointerup', endDrag);
list.addEventListener('pointercancel', endDrag);

resetBtn.addEventListener('click', () => {
  try {
    localStorage.removeItem(SECTION_KEY);
  } catch {
    /* ignore */
  }
  render();
});

render();
