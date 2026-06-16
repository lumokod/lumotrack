---
name: no-single-letter-args
description: User prefers full-word parameter names over single-letter abbreviations in code
metadata:
  type: feedback
---

When a function/callback parameter represents a **data object or entity**, name it with the full word, not a single-letter abbreviation — `data` not `d`, `error` not `e`, `request` not `req`. Applies to arrow-function callbacks too (e.g. `(data) => sendEmail(data.email)`). This does NOT apply to numeric indices — `i`, `idx`, `j` are fine for loop counters.

**Why:** The user finds full words more readable for data args and corrected `d` → `data` manually in a queue worker handler map. They explicitly clarified the rule is about data/object args, not numbers.

**How to apply:** Default to descriptive parameter names for data/object args in any code I write for this user. Also codified in [code-standards.md](../../context/code-standards.md) Conventions.
