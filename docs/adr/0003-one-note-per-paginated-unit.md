# ADR-0003: One note = one paginated unit

Date: 2026-08-09

## Status

Accepted

## Context

The reader needs to paginate vault content. Two models were considered:

1. **Whole-vault as one book:** concatenate all notes into one long flow, paginate across note boundaries. Turning pages at the end of one note advances to the next.
2. **One note per book:** each note is paginated independently. The reader shows one note at a time. Wikilinks and the sidebar handle note-to-note navigation.

## Decision

Use **one note per paginated unit**.

## Rationale

- **Mental model:** an Obsidian vault is a web of notes, not a linear book. Pagination within a note respects the atomicity of the note as a unit of thought.
- **Navigation:** wikilinks are the primary navigation mechanism (tap to jump). Linear "next note" paging would conflict with the non-linear link structure.
- **Performance:** paginating one note is fast (~1ms). Paginating the entire vault (1000+ notes) would require lazy pagination and complicate the page math.
- **Position memory:** reading position is saved per-note. This only makes sense if notes are independent units.

## Consequences

- At the last page of a note, "next page" does nothing. The user uses the sidebar or a wikilink to move on. This matches the EPUB-within-a-chapter model (chapters = notes).
- A future "continuous reading" mode (linear next-note) could be added as an option but is not the default.
- The page indicator shows `page / total` within the current note, not across the vault.
