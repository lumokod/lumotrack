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
