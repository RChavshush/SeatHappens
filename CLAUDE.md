# Cinema Reservation — Project Instructions

## Coding standards

These are hard rules for all code in this repository.

### Types live in `types.ts`

Every `type` and `interface` declaration goes in a `types.ts` file within its
package or module. Do not declare types inline in implementation files.
Runtime values (constants, Zod schemas, functions) stay in their own files;
their derived types (`z.infer<...>`, `(typeof CONST)[number]`) are re-exported
from `types.ts`.

### Use arrow functions

Declare functions as arrow functions assigned to `const`, not with the
`function` keyword. Applies to module-level functions, helpers, and callbacks.

### Comments only when the code cannot speak for itself

Do not add comments that restate what the code already says. Prefer clear
names and small functions over explanation. A comment is justified only when
it captures something the code cannot: a non-obvious algorithm, a subtle
invariant, or the reason behind a surprising decision.

## Where things are

- Spec: `docs/superpowers/specs/2026-08-17-cinema-reservation-design.md`
- Task breakdown: `docs/superpowers/plans/2026-08-17-cinema-reservation-tasks.md`
