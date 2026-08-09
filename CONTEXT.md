# CONTEXT

## What this is

vault-reader is a paginated, EPUB-style web reader for Obsidian vaults. It renders your vault notes as page-flippable "books" with live wikilinks, search, and a sidebar browser. It runs as a dev server (live-reloading edits) or builds to an offline PWA installable on e-ink readers and phones.

## The problem

Obsidian's desktop/mobile apps are powerful editors but poor **reading experiences** for linear, focused consumption. They scroll, they have toolbars and chrome, they don't paginate. EPUB readers (Apple Books, Boox NeoReader) paginate beautifully but require a manual export step and lose interactivity (live links, search, always-current content).

vault-reader fills the gap: the pagination and ergonomics of an EPUB reader, applied directly to a live Obsidian vault, accessible from any device with a browser.

## Who it is for

People who maintain an Obsidian vault and want to **read** it on:
- E-ink devices (Boox Palma, etc.) where scroll is unpleasant and battery matters
- Phones (iPhone) where a book-like paginated feel is more natural than scrolling
- Any browser, for quick access without opening Obsidian

## What it is NOT

- Not an Obsidian replacement (no editing, no plugins, no graph view)
- Not a publishing platform (no multi-user, no auth, no public hosting by default)
- Not an EPUB generator (it renders markdown live, though a future export-to-epub could layer on top)

## Domain language

| Term | Meaning |
|------|---------|
| **Vault** | An Obsidian vault: a directory of markdown files with `[[wikilinks]]` and optional YAML frontmatter |
| **Note** | A single markdown file in the vault. The atomic unit of reading. |
| **Wikilink** | An Obsidian `[[Note Name]]` reference. Resolved by filename (basename), not path. |
| **Manifest** | A JSON array of note metadata (id, title, folder, tags, links, backlinks). The reader's table of contents + link graph. |
| **Page** | One viewport-worth of paginated content within a note. Notes are split into pages via CSS multi-column layout. |
| **Flow** | The `.reader-flow` element whose multi-column content is translated horizontally to simulate page turning. |
| **Base path** | The URL prefix the app is mounted under (e.g. `/vault/` when behind a reverse proxy). |
| **Live serving** | Dev mode where the Vite plugin reads vault files from disk and auto-reloads on change. |

## Core constraints

These constraints shape every design decision. They are non-negotiable.

1. **E-ink first.** The primary target device is a Boox Palma. Animations must be optional (ghosting), contrast must be high, and the JS bundle must be small (slow e-ink processors).
2. **Cross-device.** The same app must work on e-ink (Boox/Android) and phone (iPhone) with no code changes. Input methods differ (volume buttons vs swipe).
3. **Vault is read-only.** The reader never writes to the vault. It scans, resolves, and serves. Edits happen in Obsidian.
4. **Live by default.** Edits in Obsidian should appear in the reader without a manual rebuild. The dev experience is zero-config.
5. **Offline-capable.** The production build must be installable as a PWA and work without a network connection.

## Arrow of intent

```
CONTEXT.md (this file)
  → docs/design-principles.md   (how the constraints become rules)
    → docs/architecture.md       (how the rules become structure)
      → docs/adr/                (where structure required a choice)
```

Each layer constrains the next. A change that violates a principle should trace back to CONTEXT and explain why the constraint no longer holds.
