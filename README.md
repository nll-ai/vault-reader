# vault-reader

A paginated, EPUB-style web reader for browsing Obsidian vaults. Designed for e-ink devices (Boox Palma) and iPhone. Live-reloads vault edits in dev, builds to an offline PWA for production.

## Quick start

```bash
# Zero-config CLI (recommended)
npx vault-reader dev ~/Documents/my-vault
```

Then open the printed URL on any device. Edit a note in Obsidian and the reader updates instantly.

## Features

- **Paginated reading** - CSS multi-column pagination, one note per "book." Page-turn via keyboard (Boox volume buttons in Page-turning mode), swipe (iPhone), or tap zones.
- **Live wikilinks** - `[[note]]` links render as tappable anchors that jump between notes. Back/forward browser navigation works.
- **Live reload** - edits in Obsidian appear in the reader within ~1s (dev mode). No manual rebuild.
- **Offline PWA** - production build is an installable, offline-capable PWA. Add to Home Screen on iPhone or Boox.
- **Cross-device** - same codebase serves e-ink (light theme, no animations) and iPhone (dark/sepia, slide transitions).
- **Search + browse** - sidebar with folder grouping, live title/tag search, reading-position memory per note.

## Usage

### CLI

```bash
# Dev server with live reload
vault-reader dev /path/to/vault

# Static build for production / PWA
vault-reader build /path/to/vault --out ./dist

# Mount under a sub-path (for reverse-proxy hosting)
vault-reader dev /path/to/vault --base /vault/
```

### Vite plugin (embed in your own project)

```js
import { vaultLivePlugin } from 'vault-reader/vite';

export default {
  plugins: [vaultLivePlugin('/path/to/vault')]
};
```

### Library (programmatic vault processing)

```js
import { processVault } from 'vault-reader';

const { notes, manifest, byId } = await processVault('./my-vault');
console.log(`${manifest.length} notes, ${manifest.reduce((a, n) => a + n.links.length, 0)} links`);
```

## How it works

1. **Vault processor** (`vault.mjs`) - scans `.md` files, parses frontmatter, resolves `[[wikilinks]]` into a bidirectional link graph.
2. **Vite dev plugin** (`vite-plugin.mjs`) - serves manifest + per-note JSON from memory, watches for file changes, triggers live reload.
3. **Frontend** (`frontend/`) - vanilla JS reader with CSS multi-column pagination, markdown-it rendering, keyboard/swipe/tap navigation, sidebar search.
4. **Production** - `vault-reader build` emits a static site with service-worker offline caching.

## Boox volume-button paging

On Boox devices, set the browser app's button mode to **Page-turning** (long-press app icon > Optimize > Others > Customize Buttons). The volume buttons send `PageDown`/`PageUp` key events that the reader listens for.

## Tech stack

- Vite 6 + vite-plugin-pwa
- Vanilla JS (no framework, ~50KB gzipped)
- markdown-it with a custom wikilink plugin
- CSS multi-column pagination

## License

MIT
