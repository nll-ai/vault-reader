# ADR-0001: CSS multi-column pagination

Date: 2026-08-09

## Status

Accepted

## Context

The core requirement is an EPUB-style page-turn reading experience. The reader must split a note's rendered HTML into viewport-width "pages" and let the user flip through them one at a time.

Three approaches were considered:

1. **Paged.js** - polyfills the W3C CSS Paged Media spec. Designed for print/PDF. Heavy (~100KB), print-oriented, and overkill for screen pagination.
2. **foliate-js paginator** - standalone module from the foliate ebook reader. Handles reflow, multi-column, resize. Battle-tested but designed around its book/CFI model, which is awkward for a vault-browser use case.
3. **Custom CSS multi-column** - the same technique epub.js and foliate-js use internally: set `column-width`, translate the container horizontally. ~120 lines of JS.

## Decision

Use **custom CSS multi-column pagination**.

## Rationale

- Full control over e-ink rendering (disable transitions, control repaint timing).
- No dependency to track or bundle (~120 lines vs a library).
- The technique is well-understood and documented (epub.js, foliate-js both do this).
- Precise control over the column-width + column-gap = viewport-width invariant, which is critical for exact page math.

## Consequences

- We own the pagination bugs (edge cases: image load reflow, font loading, sub-pixel rounding).
- The `paginate()` function must re-run on resize, font-size change, and image load.
- If a future feature needs print-quality pagination (running headers, page numbers in margin boxes), Paged.js becomes more attractive. But that is not a current requirement.
