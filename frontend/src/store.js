// Persistent settings + transient app state.
const STORAGE_KEY = 'vault-reader-settings';
const POSITION_KEY = 'vault-reader-positions'; // noteId -> page

const DEFAULTS = {
  fontSize: 18,
  fontFamily: 'serif',
  theme: 'light',
  animated: false
};

export const store = {
  data: { ...DEFAULTS },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      this.data = { ...DEFAULTS, ...saved };
    } catch { /* ignore */ }
    return this.data;
  },

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  },

  set(key, value) {
    this.data[key] = value;
    this.save();
  },

  savePosition(noteId, page) {
    try {
      const pos = JSON.parse(localStorage.getItem(POSITION_KEY) || '{}');
      pos[noteId] = page;
      localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
    } catch { /* ignore */ }
  },

  loadPosition(noteId) {
    try {
      const pos = JSON.parse(localStorage.getItem(POSITION_KEY) || '{}');
      return pos[noteId] ?? 0;
    } catch { return 0; }
  }
};
