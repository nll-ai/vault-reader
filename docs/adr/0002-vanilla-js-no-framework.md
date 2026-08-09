# ADR-0002: Vanilla JS, no framework

Date: 2026-08-09

## Status

Accepted

## Context

The frontend needs to: render markdown, paginate it, handle keyboard/swipe/tap input, show a searchable sidebar, and persist settings. This is a focused single-purpose reader, not a complex application.

The primary target device is a Boox Palma e-ink reader with a slow processor and limited resources. Bundle size and runtime performance matter more than developer convenience.

## Decision

Use **vanilla JS with ES modules**. No React, Vue, Svelte, or any UI framework. The only runtime dependency is markdown-it (~30KB).

## Rationale

- **E-ink performance:** frameworks add runtime overhead (virtual DOM, reactive systems, hydration) that is wasted on a paginated reader that rarely re-renders.
- **Bundle size:** the shipped JS is ~50KB gzipped. Adding React alone would double it.
- **Complexity ceiling:** the app has ~7 modules totaling ~500 lines. A framework would add ceremony (build config, component boundaries, state management) without payoff.
- **Pagination control:** the CSS multi-column pagination requires direct DOM manipulation (measuring scrollWidth, setting transforms). Framework abstractions make this harder, not easier.

## Consequences

- No reactive state management (manual DOM updates). Acceptable for this app's complexity level.
- If the app grows to need complex state (backlinks panel, graph view, annotations), a lightweight framework (Preact, Solid) should be reconsidered. The threshold is roughly: if manual DOM updates exceed ~30% of the codebase.
- DOM queries use `document.querySelector` / `getElementById`. This is explicit and debuggable.
