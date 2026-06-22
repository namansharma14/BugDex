# BugDex (Claude Code plugin)

A Pokédex for your codebase. Catalogue every bug you fix, recognise recurrences
instantly with the saved fix, and gamify the hunt — offline-first, private, and
low-noise.

This plugin is a thin adapter over the BugDex engine. It ships a self-contained
bundle (`bin/bugdex.cjs`) that the hooks and commands invoke; no network access
or API keys are required for the always-on layer.

## Install

```
/plugin marketplace add namansharma14/bugdex
/plugin install bugdex@bugdex
```

Then, in a repo you want to track:

```
bugdex init
```

## What you get

**Always-on (hooks):**

- **PostToolUse** — after every `Edit`/`Write`/`MultiEdit`, the fast matcher
  checks the changed file against your dex and, on a high-confidence hit, tells
  Claude inline (the known fix, the encounter count, and whether it's a Nemesis).
  It is deterministic, offline, and **never blocks an edit**.
- **SessionStart** — surfaces a compact trainer card and any active Nemeses.

Both honour `flair: "off"` in `.bugdex/config.json` if you want silence.

**Slash commands** (namespaced `/bugdex:*`):

| Command             | What it does                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `/bugdex:scan`      | Deep hunt for NEW species via the read-only `bug-hunter` subagent _(backing lands in M5)_ |
| `/bugdex:dex`       | List the catalogued species                                                               |
| `/bugdex:catch`     | Manually catalogue a bug you just fixed                                                   |
| `/bugdex:seal`      | Seal a recurring Nemesis with a permanent guard (apex move)                               |
| `/bugdex:card`      | Show your trainer card + active Nemeses                                                   |
| `/bugdex:dashboard` | Open the Pokédex web UI _(lands in M6)_                                                   |

**Subagent:** `bug-hunter` — read-only (`Read`, `Grep`, `Glob`); it reports
candidates as JSON and never edits code. All persistence goes through the CLI,
a deliberate safety boundary.

## Privacy & safety

- Everything is local; the dex lives in your repo's `.bugdex/`. No telemetry.
- The fast layer is LLM-free. Code only leaves your machine via your own Claude
  Code session during an explicit `/bugdex:scan`.
- Hooks run with your full permissions: the bundle treats dex content as data
  (never executed) and defends its regexes against ReDoS.
