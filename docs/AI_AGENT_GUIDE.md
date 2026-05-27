# AI Agent Guide

- Keep RBAC checks on the server even if the UI hides controls.
- Do not log tokens, secrets, or raw cookies.
- Prefer small reversible edits and run `lint`, `typecheck`, `test`, and `build` before ending a phase.
- Practice logic lives in `src/lib/practice.ts` and `src/lib/spaced-repetition.ts`.
