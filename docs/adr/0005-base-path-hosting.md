# ADR-0005: Base-path hosting via Vite base config

Date: 2026-08-09

## Status

Accepted

## Context

The reader needs to run standalone (at `/`) and behind reverse proxies at a sub-path (e.g. `/vault/` on a Caddy-served home server hosting multiple apps under one hostname).

The API namespace (`/data/manifest.json`, `/data/notes/*.json`) and asset paths (`/src/main.js`, icons) are all root-absolute by default. Behind a path-prefix proxy, these break.

## Decision

Use **Vite's `base` config** + **`import.meta.env.BASE_URL`-prefixed fetches**.

- The CLI accepts `--base /vault/` which sets Vite's `base`.
- All client-side fetches use `import.meta.env.BASE_URL + 'data/...'`.
- The API namespace is `/data/` (not `/vault/`) to avoid collision with the mount path.
- The Vite plugin middleware matches URL suffixes (`endsWith('/data/manifest.json')`) so it works under any base.
- Reverse proxies use `handle` (path-preserving, no stripping) since Vite's base handles the prefix internally.

## Rationale

- Vite's `base` is the standard mechanism for sub-path hosting. It handles HTML asset references, HMR, and PWA manifest paths.
- Using `import.meta.env.BASE_URL` in fetches is the Vite-idiomatic way to make API paths base-aware.
- The API namespace (`/data/`) is intentionally generic to avoid collision with any plausible mount path (`/vault/`, `/reader/`, `/notes/`).

## Consequences

- The client code must always use `import.meta.env.BASE_URL` for data fetches. A hardcoded `/` path will break behind a proxy. This is a lint-worthy invariant.
- Production builds are base-specific: a build with `--base /vault/` produces assets that only work at `/vault/`. This is acceptable (you rebuild when you change the mount path).
- The PWA `start_url` and `scope` are set to the base value, so "Add to Home Screen" installs at the correct path.
