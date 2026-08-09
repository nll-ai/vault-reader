// Navigation: wires keyboard (Boox page-turn mode sends PageUp/Down/Space/Arrows),
// touch swipe (iPhone), and the three tap zones. Designed so the same reader
// responds identically to a volume-button press on Boox and a swipe on iPhone.
export class Navigation {
  constructor({ reader, onTap, onChange }) {
    this.reader = reader;
    this.onTap = onTap || (() => {});
    this.onChange = onChange || (() => {});
  }

  attach() {
    window.addEventListener('keydown', this._onKey);
    this._attachSwipe(this.reader.viewport);
    // Click handling lives on the viewport so links (which sit beneath the
    // now non-interactive tap-zone overlay) still receive their normal click.
    this.reader.viewport.addEventListener('click', this._onReaderClick);
    window.addEventListener('resize', this._onResize);
  }

  detach() {
    window.removeEventListener('keydown', this._onKey);
    this.reader.viewport.removeEventListener('click', this._onReaderClick);
    window.removeEventListener('resize', this._onResize);
  }

  _onKey = (e) => {
    // Don't hijack typing/activating in interactive elements.
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.target.closest('button, summary, [contenteditable]')) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        this.reader.nextPage();
        this.onChange();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        this.reader.prevPage();
        this.onChange();
        break;
      case 'Home':
        e.preventDefault();
        this.reader.goToPage(0);
        this.onChange();
        break;
      case 'End':
        e.preventDefault();
        this.reader.goToPage(this.reader.totalPages - 1);
        this.onChange();
        break;
    }
  };

  _attachSwipe(el) {
    let startX = 0, startY = 0, startT = 0, tracking = false;
    const threshold = 40; // px

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startT = Date.now();
      tracking = true;
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      // Only treat as a horizontal swipe (ignore vertical scroll).
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) { this.reader.nextPage(); this.onChange(); }
        else { this.reader.prevPage(); this.onChange(); }
      }
    }, { passive: true });
  }

  _onReaderClick = (e) => {
    // Let links work normally: a wikilink's href ("#/note/<id>") changes the
    // hash and the router handles it. Only page-turn on plain-text taps.
    if (e.target.closest('a')) return;
    const rect = this.reader.viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    if (x < w * 0.30) {
      this.reader.prevPage();
      this.onChange();
    } else if (x > w * 0.70) {
      this.reader.nextPage();
      this.onChange();
    } else {
      this.onTap('center');
    }
  };

  _onResize = () => {
    // Debounce; re-pagination on orientation/size change.
    clearTimeout(this._rt);
    this._rt = setTimeout(() => this.reader.paginate(), 120);
  };
}
