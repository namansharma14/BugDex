---
description: Manually catalogue a new bug species in the BugDex.
argument-hint: "--type <type> --common <name> [--severity 1-5] [--fix <summary>] [--pattern <regex>]"
---

Catalogue a bug I just fixed.

Determine the details — from `$ARGUMENTS` if I provided them, otherwise infer them from our recent conversation and diff:

- a BugDex **type**: `null | injection | concurrency | memory | logic | crypto | auth | resource | type | config`
- a plain-English **--common** name (e.g. "Unguarded null dereference")
- a **--severity** 1–5 (5 = RCE / auth bypass / secret leak)
- a one-line **--fix** summary
- if you can write a tight, low-false-positive one, a regex **--pattern** (with `--lang`) so the fast matcher can re-catch this class

Then run the CLI with those flags:

`node "${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs" catch --type <type> --common "<name>" --severity <n> --fix "<summary>" [--pattern "<regex>" --lang <langs>]`

Report the caught species, XP gained, and any rank or badge changes.
