// App shell: loads the manifest, wires the reader/sidebar/navigation together,
// and handles hash-based routing so wikilinks and the back button work.
import './styles.css';
import { Reader } from './reader.js';
import { Navigation } from './navigation.js';
import { Sidebar } from './sidebar.js';
import { store } from './store.js';

const $ = (sel) => document.querySelector(sel);

let manifest = [];
let byId = new Map();
let reader, sidebar, nav;

async function main() {
  // Load settings + apply theme before paint where possible.
  store.load();
  applySettings();

  // Load manifest.
  const res = await fetch(import.meta.env.BASE_URL + 'data/manifest.json');
  manifest = await res.json();
  byId = new Map(manifest.map(n => [n.id, n]));

  // Wire reader.
  reader = new Reader($('#reader-viewport'), $('#reader-flow'), manifest, {
    onPageChange: (page, total) => {
      $('#page-indicator').textContent = total > 1 ? `${page + 1} / ${total}` : '';
      if (reader.currentNote) store.savePosition(reader.currentNote.id, page);
    }
  });
  reader.applyTheme(store.data);

  // Wire sidebar.
  sidebar = new Sidebar($('#note-list'), $('#search-input'), manifest, {
    onNavigate: (id) => openNote(id)
  });
  $('#note-list').addEventListener('click', (e) => sidebar.handleClick(e));

  // Wire navigation.
  nav = new Navigation({
    reader,
    onTap: (zone) => {
      if (zone === 'center') toggleChrome();
    },
    onChange: () => {}
  });
  nav.attach();

  // Settings panel controls.
  wireSettings();

  // Top bar buttons.
  $('#menu-btn').addEventListener('click', () => openSidebar());
  $('#settings-btn').addEventListener('click', () => toggleSettings());

  // Route from hash.
  window.addEventListener('hashchange', route);
  route();

  // Register service worker (PWA) for offline use.
  registerSW();
}

function route() {
  const m = location.hash.match(/^#\/note\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    if (byId.has(id)) { openNote(id, false); return; }
  }
  // Landing: try to open an Index note, else open the sidebar.
  const indexNote = manifest.find(n => n.name && n.name.toLowerCase() === 'index');
  if (indexNote) openNote(indexNote.id, false);
  else openSidebar();
}

async function openNote(id, pushHistory = true) {
  const note = byId.get(id);
  if (!note) return;
  if (pushHistory && location.hash !== `#/note/${id}`) {
    history.pushState(null, '', `#/note/${id}`);
  }
  $('#note-title').textContent = note.title;
  sidebar.setCurrent(id);
  await reader.loadNote(note);

  // Restore reading position (goToPage clamps to the valid range).
  const saved = store.loadPosition(id);
  if (saved > 0) reader.goToPage(saved);

  closeSidebar();
}

function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#sidebar-backdrop').hidden = false;
  setTimeout(() => $('#search-input').focus(), 50);
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-backdrop').hidden = true;
}

$('#sidebar-backdrop')?.addEventListener('click', closeSidebar);

let chromeVisible = true;
function toggleChrome() {
  chromeVisible = !chromeVisible;
  document.body.classList.toggle('no-chrome', !chromeVisible);
}

function wireSettings() {
  const fontDec = $('#font-dec');
  const fontInc = $('#font-inc');
  const fontFamily = $('#font-family');
  const theme = $('#theme');
  const animated = $('#animated');

  fontFamily.value = store.data.fontFamily;
  theme.value = store.data.theme;
  animated.checked = store.data.animated;
  $('#font-size-val').textContent = store.data.fontSize + 'px';

  const changeFontSize = (delta) => {
    const next = Math.max(14, Math.min(28, store.data.fontSize + delta));
    if (next === store.data.fontSize) return;
    store.set('fontSize', next);
    $('#font-size-val').textContent = next + 'px';
    applySettings();
    reader.paginate();
  };

  fontDec.addEventListener('click', () => changeFontSize(-1));
  fontInc.addEventListener('click', () => changeFontSize(1));
  fontFamily.addEventListener('change', () => {
    store.set('fontFamily', fontFamily.value);
    applySettings();
    reader.paginate();
  });
  theme.addEventListener('change', () => {
    store.set('theme', theme.value);
    applySettings();
  });
  animated.addEventListener('change', () => {
    store.set('animated', animated.checked);
    reader.setAnimated(animated.checked);
  });
}

function applySettings() {
  document.documentElement.dataset.theme = store.data.theme;
  document.documentElement.dataset.font = store.data.fontFamily;
  document.documentElement.style.setProperty('--reader-font-size', store.data.fontSize + 'px');
}

function toggleSettings() {
  const p = $('#settings-panel');
  p.hidden = !p.hidden;
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* vite-plugin-pwa injects its own SW; this is a fallback no-op */
      });
    });
  }
}

main().catch(err => {
  console.error(err);
  $('#reader-flow').innerHTML = '<p class="reader-error">Failed to start. Run npm run build:vault first.</p>';
});
