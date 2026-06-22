# BugDex 🐛📕

> A Pokédex for your codebase. Catalogue every bug you fix, recognise recurrences instantly with the saved fix, and gamify the hunt — offline-first, private, and low-noise.

BugDex is a **bug _memory_, not a bug scanner.** Every bug you catch and fix
becomes a catalogued "species" with its fix attached. The next time that _class_
of bug reappears — written by anyone, anywhere in the repo — BugDex recognises it
instantly and surfaces the known fix.

It ships two deliberately split engines:

- A **fast engine** — deterministic, free, offline, always-on. It only recognises
  bugs already in your dex and only speaks when confident.
- A **deep engine** — LLM-backed, on-demand. It discovers _new_ species during an
  explicit `/bugdex:scan`.

New-bug discovery is gamified into a progression system, but **every game mechanic
maps to a real engineering behaviour** — and the endgame is permanently _sealing_
bug classes out of the codebase with a test or lint rule.

> One-line pitch: _"Never re-fight a bug you've already beaten — and make your
> whole team inherit the win."_

## Status

🚧 **Early development.** Being built milestone-by-milestone (see `SPEC.md`).

| Milestone | What                          | State |
| --------- | ----------------------------- | ----- |
| M0        | Monorepo scaffold             | ✅    |
| M1        | Core data model & storage     | ✅    |
| M2        | Fast matcher + catch/seal CLI | ✅    |
| M3        | Claude Code plugin adapter    | ✅    |
| M4        | Terminal rendering & flair    | ⏳    |
| M5        | Deep discovery loop           | ⏳    |
| M6        | Pokédex dashboard             | ⏳    |
| M7        | Docs, polish, publish         | ⏳    |

## Repository layout

```text
bugdex/
├── .claude-plugin/        # repo doubles as a Claude Code marketplace
├── plugins/bugdex/        # the Claude Code plugin (thin adapter)
├── packages/core/         # the engine + CLI (published to npm as `bugdex`)
└── apps/dashboard/        # the Pokédex web UI (Vite + React)
```

## Development

Requires **Node.js 22+**.

```bash
npm install      # install workspace dependencies
npm run build    # build all packages
npm test         # run the test suite
npm run lint     # lint
```

## License

[MIT](./LICENSE) © Naman Sharma
