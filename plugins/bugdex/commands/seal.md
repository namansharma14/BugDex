---
description: Seal a recurring Nemesis with a permanent guard (test, lint rule, type, or assertion).
argument-hint: "<species-id> --kind <test|lint-rule|type|assertion> --ref <reference>"
---

Seal a bug class out of the codebase — the apex move.

1. If the guard doesn't exist yet, help me create it: a regression **test**, a **lint-rule**, a **type** constraint, or an **assertion** that would catch this bug class if it ever returns.
2. Once the guard exists, run `node "${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs" seal $ARGUMENTS` — e.g. `seal voidling --kind test --ref tests/null_guard.test.ts`.
3. Report the seal, the +120 XP, and any rank or badge changes.
