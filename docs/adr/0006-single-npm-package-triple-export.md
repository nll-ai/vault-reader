# ADR-0006: Single npm package with triple export

Date: 2026-08-09

## Status

Accepted

## Context

The package needs to serve three audiences:

1. **CLI users** who want zero-config: `npx vault-reader dev /vault`
2. **Vite users** who want to embed the reader in their own project: `import { vaultLivePlugin } from 'vault-reader/vite'`
3. **Library users** who want programmatic vault processing: `import { processVault } from 'vault-reader'`

## Decision

Publish **one npm package** with three export surfaces.

```json
{
  "bin": { "vault-reader": "./cli.mjs" },
  "exports": {
    ".": "./index.mjs",
    "./vite": "./vite-plugin.mjs",
    "./processor": "./vault.mjs"
  }
}
```

## Rationale

- **One install:** `npm install vault-reader` gives you all three modes. No confusion about which package to install.
- **Shared frontend:** the CLI serves `frontend/` from inside the package. The frontend is not published separately; it is an implementation detail of the CLI.
- **Precedent:** `vite-plugin-pwa`, `@astrojs/*` packages follow this pattern (plugin + CLI + library from one package).
- **The frontend is pre-built into the package:** the CLI uses Vite's programmatic API with `root: frontend/` inside the installed package. Users do not need the frontend source; they get a working reader out of the box.

## Consequences

- The `files` field in package.json must include `frontend/` (the pre-built UI) alongside the JS modules. Package size is ~60KB unpacked, which is fine.
- Breaking changes to `processVault()` or `vaultLivePlugin()` affect all three consumer types simultaneously. Semver is essential.
- The frontend source (`frontend/src/`) is included in the package for transparency, but consumers should not import from it directly (it is not in `exports`).
