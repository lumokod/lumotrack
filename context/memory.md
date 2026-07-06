# Memory

Persistent notes about the user's preferences and project decisions that aren't
obvious from the code. One section per memory.

## No single-letter args

_Type: feedback_

When a function/callback parameter represents a **data object or entity**, name it
with the full word, not a single-letter abbreviation — `data` not `d`, `error` not
`e`, `request` not `req`. Applies to arrow-function callbacks too (e.g.
`(data) => sendEmail(data.email)`). This does NOT apply to numeric indices — `i`,
`idx`, `j` are fine for loop counters.

**Why:** The user finds full words more readable for data args and corrected
`d` → `data` manually in a queue worker handler map. They explicitly clarified the
rule is about data/object args, not numbers.

**How to apply:** Default to descriptive parameter names for data/object args in any
code written for this user. Also codified in
[code-standards.md](code-standards.md) Conventions.

## Comments in code: one line max

_Type: feedback_

Never write multi-line comment blocks in code files. Condense every comment to a
single line stating the one non-obvious constraint; move longer rationale into the
`context/*.md` files (optionally leaving a `see <file>.md → <section>` pointer).

**Why:** The user reviewed the live-tracking feature (2026-07-06), saw multi-line
comments in code files, and asked for them all to be reduced to one-liners with the
context moved to md files — "never write a lot of comments in a code file."

**How to apply:** Before finishing any change, scan for consecutive `//` lines and
condense. Applies to source, tests, and helpers alike. Also codified in
[code-standards.md](code-standards.md) Conventions.

## Persist notes in context files, not assistant memory

_Type: feedback_

The user wants persistent project notes, decisions, and preferences recorded in the
in-repo `context/*.md` files (plus `CLAUDE.md` / `README.md`) — **not** in the
assistant's private/built-in memory store.

**Why:** The user wants durable knowledge to live in the repository where they can see,
edit, and version it, rather than in an external memory they don't control.

**How to apply:** When something is worth remembering for future sessions, write it to
the appropriate context file — `context/memory.md` for non-obvious preferences and
decisions, `context/code-standards.md` for conventions, `context/architecture.md` for
structure. Do not create or maintain files in the assistant's memory directory for this
project.
