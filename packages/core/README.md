# bugdex

> A Pokédex for your codebase: catalogue every bug you fix, recognise recurrences
> instantly with the saved fix, and gamify the hunt — offline-first, private, low-noise.

This is the **BugDex engine + CLI**. It also ships as a
[Claude Code plugin](https://github.com/namansharma14/bugdex); this package is the
standalone command line tool and the library the plugin bundles.

## Install

```bash
npm install -g bugdex   # or: npx bugdex <command>
```

Requires **Node.js 22+**. Everything is local — no API keys, no telemetry.

## Use

```bash
bugdex init                                   # create .bugdex/ in your repo
bugdex catch --type null --common "Null deref" --severity 2 \
  --fix "Guard before deref." --pattern 'x\.y' --lang typescript
bugdex match src/                             # fast, offline recognition
bugdex dex                                    # browse the catalogue
bugdex card                                   # your trainer card
bugdex seal <id> --kind test --ref tests/guard.test.ts
bugdex dashboard                              # Pokédex web UI on :4317
bugdex verify-seals                           # re-check sealed guards still exist
```

| Command                  | What it does                                          |
| ------------------------ | ----------------------------------------------------- |
| `init`                   | Create `.bugdex/` (dex, config, trainer)              |
| `match [paths]`          | Recognise catalogued species (deterministic, offline) |
| `catch …`                | Manually catalogue a bug (or `--from-scan <json>`)    |
| `scan --collect`         | Gather a diff + dex summary for deep discovery        |
| `seal <id> …`            | Seal a Nemesis with a permanent guard                 |
| `dex` · `card` · `stats` | Browse the dex / trainer card / stats                 |
| `dashboard`              | Serve the Pokédex web UI                              |
| `verify-seals`           | Revert seals whose guard files vanished               |

The **fast matcher** is LLM-free and offline; **deep discovery** (`/bugdex:scan`)
runs through your own Claude Code session via the plugin. The dex lives in
`.bugdex/dex.json` — commit it to share bug memory across your team.

See the [full README](https://github.com/namansharma14/bugdex#readme) for the plugin,
the game design, and screenshots.

## License

[MIT](./LICENSE) © Naman Sharma
