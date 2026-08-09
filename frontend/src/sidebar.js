// Sidebar: renders the note list grouped by folder, with live search.
// Clicking a note navigates via hash so the browser back button works.
export class Sidebar {
  constructor(listEl, searchEl, manifest, opts = {}) {
    this.listEl = listEl;
    this.searchEl = searchEl;
    this.manifest = manifest;
    this.onNavigate = opts.onNavigate || (() => {});
    this.currentId = null;
    this._build();
    this._render(''); // populate immediately so the panel isn't blank on first open
  }

  _build() {
    this.searchEl.addEventListener('input', () => this._render(this.searchEl.value.trim().toLowerCase()));
  }

  setCurrent(id) {
    this.currentId = id;
    this._render(this.searchEl.value.trim().toLowerCase());
    // scroll active note into view
    const el = this.listEl.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView({ block: 'center' });
  }

  _render(query) {
    let notes = this.manifest;
    if (query) {
      notes = this.manifest.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.folder.toLowerCase().includes(query) ||
        (n.tags || []).some(t => t.toLowerCase().includes(query))
      );
    }

    // Group by top-level folder for browsability.
    const groups = new Map();
    for (const n of notes) {
      const top = n.folder ? n.folder.split(SEP_REGEX)[0] : 'Notes';
      if (!groups.has(top)) groups.set(top, []);
      groups.get(top).push(n);
    }

    const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const html = sortedGroups.map(([folder, items]) => {
      items.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
      const itemsHtml = items.map(n => {
        const active = n.id === this.currentId ? ' data-active="true"' : '';
        const sub = n.folder ? `<span class="note-sub">${escapeHtml(shorten(n.folder))}</span>` : '';
        return `<li><button class="note-item" data-id="${n.id}"${active}><span class="note-title">${escapeHtml(n.title)}</span>${sub}</button></li>`;
      }).join('');
      return `<details class="folder" open><summary class="folder-name">${escapeHtml(folder)} <span class="count">${items.length}</span></summary><ul class="folder-items">${itemsHtml}</ul></details>`;
    }).join('');

    this.listEl.innerHTML = html || '<p class="empty">No notes found.</p>';
  }

  handleClick(e) {
    const btn = e.target.closest('.note-item');
    if (!btn) return;
    const id = btn.dataset.id;
    this.onNavigate(id);
  }
}

const SEP_REGEX = /[\\/]/;
function sepLike(s) { return s.split(SEP_REGEX); }
function shorten(folder) { return folder.split(SEP_REGEX).slice(-2).join('/'); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
