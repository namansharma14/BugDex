---
description: Hunt the current diff (or a path) for NEW bug species and add confirmed ones to the BugDex.
argument-hint: "[path | --diff]"
---

Run a deep bug hunt.

1. **Collect:** run `node "${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs" scan $ARGUMENTS --collect` (defaults to `--diff` when no argument). This prints the target files/diff plus a summary of existing dex signatures, as JSON.
2. **Analyse** with the **bug-hunter** subagent to find genuine NEW bugs/vulnerabilities not already represented by an existing signature.
3. **De-duplicate** every candidate against existing species — a candidate that already matches an existing signature is an _encounter_, not a new species.
4. **Present** findings as a numbered list: name · type · severity · file:line · proposed fix.
5. On my confirmation, **persist** each with `node "${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs" catch --from-scan <json>` and report the XP/rank changes.
