# CLAUDE.md

> Reusable agent instructions template. Copy this file into any project root,
> then fill in the **Project-Specific** sections at the bottom. Everything above
> them is project-agnostic and can stay as-is.

---

## Core Principles

1. **Simplicity first.** Prefer the simplest solution with the fewest lines of
   code — without losing functionality. Fewer lines = better.
2. **Minimal changes.** If a small edit solves the problem, make the small edit.
   Do not rewrite what already works.
3. **Solve it like a senior developer.** Think about consequences, edge cases,
   and maintainability before writing code.
4. **No workarounds, no fallbacks.** Fallbacks hide bugs. Data must be correct at
   the source. If you cannot do it cleanly, stop and ask for more logs or data
   instead of patching around the problem.

---

## Code Quality

1. **DRY (Don't Repeat Yourself).** Never duplicate logic. Extract reusable
   functions, components, or constants instead of copy/paste.
2. **Reuse before creating.** Search the codebase for existing code that already
   does the job. Make an extra effort to reuse what is already there.
3. **Single Source of Truth.** Each piece of data has exactly one authoritative
   location.
4. **Early Return.** Exit early to avoid deep nesting.
5. **SOLID + Clean Code.** Apply where it improves clarity, not as ceremony.
6. **Remove dead code.** Delete unused or unreachable code once the task is done.
7. **One word per concept.** Pick a single verb for an action and use it
   everywhere.

   - ❌ `getUser`, `fetchOrder`, `retrieveProduct`
   - ✅ `getUser`, `getOrder`, `getProduct`

8. **English variable names.** All identifiers in English.

---

## State Management

1. **Centralize state.** Keep application state in a single central object rather
   than scattering updates across the codebase.
2. **Controlled mutations only.** Every state change goes through controlled
   functions. No direct, scattered mutations. This guarantees consistency,
   predictability, and easy debugging.

---

## File & Folder Conventions

1. **`src/` holds source code only.** Tests, fixtures, and tooling live outside
   `src/`.
2. Keep the directory structure flat and predictable. Group by feature when it
   helps navigation.

---

## Logging

1. **Do not remove logs** unless explicitly told to remove logs.
2. **Use `JSON.stringify`** for structured data in logs so they are easy to
   capture from the console.
3. Use the project's real logger API. Verify a logging function exists before
   calling it — do not assume helpers like `logger.info` are available.




## 13. Domain Rules / Business Logic

_<Project-specific rules the agent must never violate.>_
