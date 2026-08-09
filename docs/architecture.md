# Architecture

## Overview

Three layers, each with a clear boundary:

```
┌─────────────────────────────────────────────────────┐
│                     CLI (cli.mjs)                     │
│         npx vault-reader dev|build <vault>           │
├─────────────┬────────────────┬───────────────────────┤
│  Processor  │  Vite Plugin   │      Frontend         │
│ (vault.mjs) │ (vite-plugin)  │   (frontend/src/)     │
│             │                │                       │
│ Scans .md   │ Serves live    │  Paginated reader UI  │
│ Resolves    │ Watches vault  │  markdown-it render   │
│ wikilinks   │ Triggers HMR   │  keyboard/swipe/tap   │
│ Builds      │                │  sidebar + search     │
│ link graph  │                │                       │
└─────────────┴────────────────┴───────────────────────┘
      ↓                ↓                   ↓
  {notes,         /data/*.json        Browser DOM
  manifest}       (live or static)    (paginated)
```

## Data flow

### Dev mode (live)

```
Obsidian edit
  → fs.watch fires (400ms debounce)
    → processVault() re-reads changed files
      → in-memory manifest + notes updated
        → Vite ws.send({ type: 'full-reload' })
          → browser reloads, re-fetches /data/manifest.json
            → reader re-renders current note
```

### Production mode (static build)

```
vault-reader build /vault
  → processVault() reads entire vault
    → writes public/data/manifest.json + public/data/notes/*.json
      → vite build bundles frontend + PWA service worker
        → dist/ served by any static host
```

## The vault processor (vault.mjs)

Pure function: `async processVault(root) → { notes, manifest, byId, byBasename }`

1. **Walk** the directory, skipping dot-dirs, `node_modules`, and the reader's own directory.
2. **Parse** each `.md` file: extract YAML frontmatter (including block-list tags), strip it from the body, derive a title (frontmatter > H1 > filename).
3. **Slugify** filenames into URL-safe ids. Deduplicate with suffixes.
4. **Index** by basename (lowercased) for wikilink resolution. Obsidian resolves `[[Note]]` by filename, not path.
5. **Resolve** wikilinks: each `[[Target]]` looks up `target.toLowerCase()` in the basename index → target id. Build forward links + backward links (backlinks).
6. **Emit** manifest (metadata array) + per-note objects (id, title, markdown).

The processor is consumed by both the CLI (build mode) and the Vite plugin (dev mode). It has no I/O dependencies beyond `fs.readFile`.

## The Vite dev plugin (vite-plugin.mjs)

`vaultLivePlugin(vaultRoot) → Vite plugin`

- **On server start:** calls `processVault()`, holds the result in memory.
- **Middleware:** intercepts `/data/manifest.json` and `/data/notes/<id>.json` requests, serves from memory. Matching is suffix-based (`endsWith`) so it works under any base path.
- **File watcher:** `fs.watch(root, { recursive: true })` on macOS (FSEvents). Debounces 400ms. On `.md` change, re-runs `processVault()` and sends `full-reload`.
- **Production:** the plugin is dev-only. Production uses static files written by the build command.

## The frontend (frontend/src/)

Vanilla JS modules, no framework:

| Module | Responsibility |
|--------|---------------|
| `main.js` | App shell: loads manifest, wires modules, hash routing, settings UI |
| `reader.js` | Pagination engine: renders markdown via markdown-it, CSS multi-column pagination math, page navigation |
| `navigation.js` | Input: keyboard (keydown for Boox page-turn mode), touch swipe (iPhone), tap zones (left/center/right) |
| `sidebar.js` | Note browser: folder grouping, live search, click-to-navigate |
| `wikilink.js` | markdown-it plugin: renders `[[wikilinks]]` as `<a>` tags, resolves via basename index |
| `store.js` | Settings persistence (localStorage): font size/family, theme, animation toggle, reading position per note |

### Pagination technique (the core innovation)

The reader uses CSS multi-column layout to split a note's rendered HTML into viewport-width "pages":

```
.reader-viewport { overflow: hidden; width: 100%; height: 100%; }
.reader-flow {
  column-width: <viewport-width - 2*margin>;
  column-gap: <2*margin>;     /* so column-width + gap == viewport-width */
  transform: translateX(-<page * viewport-width>);
}
```

Key invariant: **column-width + column-gap must equal the viewport width.** This ensures:
- `scrollWidth = totalPages × viewportWidth` (exact, no rounding drift)
- `translateX(-page × viewportWidth)` lands exactly on each column boundary
- Each page shows one column with equal left/right reading margins

The `paginate()` function reads `getComputedStyle(flow).paddingLeft` to determine the margin, sets `columnWidth` and `columnGap` accordingly, computes `totalPages = Math.round(scrollWidth / viewportWidth)`, and clamps the current page.

Re-pagination triggers on: note load (after images decode), window resize/orientation change, font-size change.

## Routing

Hash-based: `#/note/<id>`. Wikilinks render as `<a href="#/note/<id>">`. Clicking changes the hash → `hashchange` event → `route()` loads the note. Browser back/forward works naturally. No history API complexity.

## Base-path awareness

All client-side fetches use `import.meta.env.BASE_URL` as a prefix:
```js
fetch(import.meta.env.BASE_URL + 'data/manifest.json')
```

This lets the app run at `/` (standalone) or `/vault/` (behind Caddy/reverse proxy) without code changes. The CLI's `--base` flag sets the Vite base, which propagates to `import.meta.env.BASE_URL`.

## The CLI (cli.mjs)

Uses Vite's programmatic API (`createServer`, `build`) instead of a config file:

- **dev:** `createServer({ root: FRONTEND_DIR, plugins: [vaultLivePlugin(vault), pwaConfig()] })`
- **build:** process vault → write static data → `build({ root: FRONTEND_DIR, plugins: [pwaConfig()] })`

`FRONTEND_DIR` resolves to `frontend/` inside the installed package, so the CLI works from any directory. `configFile: false` prevents Vite from picking up a stray `vite.config.js` from the user's working directory.

## Package exports

```json
{
  "bin": { "vault-reader": "./cli.mjs" },
  "exports": {
    ".": "./index.mjs",           // library: processVault, vaultLivePlugin
    "./vite": "./vite-plugin.mjs", // Vite plugin only
    "./processor": "./vault.mjs"   // vault processor only
  }
}
```

Three consumption modes, one install, no separate packages.
