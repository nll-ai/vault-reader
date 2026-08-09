// Reader: renders a note's markdown into a multi-column flow and paginates it
// so the viewport shows one "page" at a time. This is the same CSS multi-column
// technique epub.js and foliate-js use under the hood, kept minimal for
// precise control over e-ink refresh (no forced animation) vs iPhone (slide).
import MarkdownIt from 'markdown-it';
import { wikilinkPlugin } from './wikilink.js';

export class Reader {
  constructor(viewportEl, flowEl, manifest, opts = {}) {
    this.viewport = viewportEl;
    this.flow = flowEl;
    this.manifest = manifest;
    this.currentPage = 0;
    this.totalPages = 1;
    this.currentNote = null;
    this.onPageChange = opts.onPageChange || (() => {});

    // Build a basename->id lookup for wikilink resolution at render time.
    // Wikilinks resolve by FILENAME (e.g. [[Note]] matches "Note.md"), not by
    // the display title, so we index on the manifest `name` field.
    this.basenameIndex = new Map();
    for (const n of manifest) {
      if (n.name) {
        const key = n.name.toLowerCase().trim();
        if (!this.basenameIndex.has(key)) this.basenameIndex.set(key, n.id);
      }
    }

    this.md = new MarkdownIt({
      html: false,
      linkify: true,
      typographer: true,
      breaks: false
    });
    this.md.use(wikilinkPlugin, { resolve: (b) => this.basenameIndex.get(b) || null });
  }

  setAnimated(animated) {
    this.flow.classList.toggle('animated', !!animated);
  }

  applyTheme(settings) {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.font = settings.fontFamily;
    document.documentElement.style.setProperty('--reader-font-size', settings.fontSize + 'px');
  }

  async loadNote(note) {
    this.currentNote = note;
    this.currentPage = 0;

    // Fetch the note's markdown.
    let data;
    try {
      const res = await fetch(import.meta.env.BASE_URL + `data/notes/${note.id}.json`);
      data = await res.json();
    } catch (e) {
      this.flow.innerHTML = '<p class="reader-error">Could not load this note.</p>';
      this.paginate();
      return;
    }

    // Render markdown into the flow.
    const html = this.md.render(data.markdown || '');
    this.flow.innerHTML = html;

    // Wait for images to decode so the first pagination is accurate and the
    // restored reading position (set by main.js after this resolves) is stable.
    await this._awaitImages();
    await this._nextFrame();
    this.paginate();
  }

  _awaitImages() {
    const imgs = [...this.flow.querySelectorAll('img')];
    if (!imgs.length) return Promise.resolve();
    return Promise.all(imgs.map(img =>
      img.complete ? Promise.resolve() : new Promise(res => {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      })
    ));
  }

  _nextFrame() {
    return new Promise(r => requestAnimationFrame(() => r()));
  }

  paginate() {
    if (!this.flow.firstChild) { this.totalPages = 1; return; }
    const w = this.viewport.clientWidth;
    if (w === 0) return;
    // Account for the flow's horizontal padding (reading margins) so that
    // column-width + column-gap == viewport width. Each page then renders one
    // column with equal left/right margins, and translateX(page * w) lands
    // exactly on the next column boundary.
    const cs = getComputedStyle(this.flow);
    const m = parseFloat(cs.paddingLeft) || 0;
    const colW = Math.max(80, w - 2 * m);
    this.flow.style.columnWidth = colW + 'px';
    this.flow.style.columnGap = (w - colW) + 'px';
    const sw = this.flow.scrollWidth;
    this.totalPages = Math.max(1, Math.round(sw / w));
    if (this.currentPage >= this.totalPages) this.currentPage = this.totalPages - 1;
    if (this.currentPage < 0) this.currentPage = 0;
    this._renderPage();
    this.onPageChange(this.currentPage, this.totalPages);
  }

  _renderPage() {
    const w = this.viewport.clientWidth;
    this.flow.style.transform = `translateX(${-this.currentPage * w}px)`;
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this._renderPage();
      this.onPageChange(this.currentPage, this.totalPages);
      return true;
    }
    return false;
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this._renderPage();
      this.onPageChange(this.currentPage, this.totalPages);
      return true;
    }
    return false;
  }

  goToPage(n) {
    this.currentPage = Math.max(0, Math.min(n, this.totalPages - 1));
    this._renderPage();
    this.onPageChange(this.currentPage, this.totalPages);
  }
}
