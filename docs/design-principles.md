# Design Principles

These principles translate the [core constraints](../CONTEXT.md#core-constraints) into rules that guide implementation. Every architectural decision and code change should be checkable against these.

## 1. Minimal JavaScript, no framework

**Constraint:** E-ink first (slow processors, small budgets).

**Rule:** The frontend is vanilla JS. No React, Vue, Svelte, or runtime framework. The only dependencies are markdown-it (rendering) and Vite (build tooling, not shipped). Bundle stays under ~60KB gzipped.

**Check:** If a new feature requires adding a framework or doubling the bundle, the feature is wrong.

## 2. Pagination is CSS multi-column

**Constraint:** E-ink first (page-turn feel, no scroll).

**Rule:** Pagination uses the browser's native CSS multi-column layout (`column-width`, `column-gap`). The flow element is translated horizontally by page-width increments. This is the same technique epub.js and foliate-js use. No JS-based layout engines.

**Check:** If pagination breaks when a new CSS property is added to the flow, the property is interfering with column layout and must be moved to a child element.

## 3. One note = one paginated unit

**Constraint:** Cross-device (notes are the natural reading unit).

**Rule:** Each note is paginated independently. Turning pages advances within a note. Wikilinks jump between notes. The sidebar browses notes. There is no "whole-vault as one long book" mode.

**Check:** If a feature paginates across note boundaries, it violates the note-as-unit model.

## 4. The vault processor is pure

**Constraint:** Vault is read-only.

**Rule:** `processVault()` takes a directory path, reads files, and returns `{ notes, manifest, byId }`. It never writes to disk, never mutates the vault, and has no side effects. The build step writes to a separate output directory.

**Check:** If the processor is modified to write back to the vault, it has been misused.

## 5. Live serving means zero config

**Constraint:** Live by default.

**Rule:** `npx vault-reader dev /path/to/vault` starts a working dev server with live reload. No config file, no build step, no manual refresh. The Vite plugin handles vault watching and serving internally.

**Check:** If a user must create a config file or run a build command before `dev` works, the zero-config promise is broken.

## 6. Animations are opt-in

**Constraint:** E-ink first (ghosting on page transitions).

**Rule:** Page-turn transitions are disabled by default. The settings panel has an "animations" toggle. On e-ink, the user leaves it off. On phone, they turn it on. The code never assumes animations are enabled.

**Check:** If a page turn produces a visual artifact on a Boox, the animation default is wrong.

## 7. Base path is first-class

**Constraint:** Cross-device (hosted behind reverse proxies on home networks).

**Rule:** The app works at any URL prefix via Vite's `base` config. All fetch paths use `import.meta.env.BASE_URL`. The CLI accepts `--base /vault/`. Reverse-proxy hosting (Caddy, Tailscale serve) is a documented use case, not an afterthought.

**Check:** If a fetch path is hardcoded to `/`, it will break behind a reverse proxy.

## 8. Three consumption modes, one package

**Constraint:** Cross-device (different users need different integration levels).

**Rule:** The npm package exports three things from one install: a CLI (`npx vault-reader dev`), a Vite plugin (`import { vaultLivePlugin } from 'vault-reader/vite'`), and a library (`import { processVault } from 'vault-reader'`). No separate packages.

**Check:** If a change to the CLI breaks the plugin or library export, the triple-export contract is violated.
