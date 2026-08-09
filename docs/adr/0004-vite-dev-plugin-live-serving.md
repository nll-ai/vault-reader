# ADR-0004: Vite dev plugin for live serving

Date: 2026-08-09

## Status

Accepted

## Context

The reader needs vault data (manifest + per-note JSON). Two delivery approaches:

1. **Static build only:** a build step scans the vault and writes JSON files. The dev server serves these statically. To see edits, the user re-runs the build. This is simple but breaks the "live by default" constraint.
2. **Vite dev plugin:** a custom plugin reads vault files from memory and watches for changes. The dev server serves live data with zero config and auto-reloads on edits.

## Decision

Use a **Vite dev plugin** for dev mode. Keep the static build for production.

## Rationale

- **Zero config:** `npx vault-reader dev /vault` just works. No build step, no `--watch` flag, no manual refresh.
- **Instant feedback:** edits in Obsidian appear in the reader within ~1s (400ms debounce + reprocess + reload). This matches the Vite HMR DX that developers expect.
- **The plugin is dev-only:** production uses the static build, so the plugin adds no runtime weight to the PWA.
- **Vite integration:** the plugin hooks into Vite's middleware stack and WebSocket, so HMR/reload works natively without a custom WebSocket server.

## Consequences

- The plugin holds the entire vault in memory (manifest + note markdown). For a 1000-note vault this is ~20MB, which is fine for dev.
- The plugin uses `fs.watch({ recursive: true })` which is efficient on macOS (FSEvents) but may need `chokidar` on Linux/Windows for reliability. Currently macOS-only is acceptable given the target devices.
- Full re-process on every change (not incremental). For 1000 notes this takes <1s, debounced. Incremental processing is a future optimization if vaults grow much larger.
