# Contributing to BugDex

Thanks for helping build the Pokédex for codebases! Issues, PRs, and new bug
"species" are all welcome.

## Ways to contribute

- 🐛 **Report a bug** or 💡 **request a feature** via the
  [issue templates](https://github.com/namansharma14/bugdex/issues/new/choose).
- 🧬 **Add a bug species** to the starter dex — a recurring bug class, its
  signature, and the fix.
- 📖 **Improve docs**, examples, or the dashboard.
- 🧪 **Harden the matcher** — new languages, structural signals, ReDoS edge cases.

New here? Look for issues labelled
[`good first issue`](https://github.com/namansharma14/bugdex/labels/good%20first%20issue).

## Development setup

Requires **Node.js 22+**.

```bash
git clone https://github.com/namansharma14/bugdex
cd bugdex
npm install
npm run build      # dashboard → embed → core (+ plugin bundle)
npm test           # Vitest
npm run lint && npm run typecheck
npm run format     # Prettier
```

Monorepo layout:

- `packages/core` — the engine + CLI (published to npm as `bugdex`)
- `apps/dashboard` — the Pokédex web UI (Vite + React)
- `plugins/bugdex` — the Claude Code plugin (thin adapter + committed bundle)

## Pull requests

- Branch off `main`; keep PRs focused.
- Use [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `chore:` …).
- **Tests are part of "done"** — add or update them and keep them green. CI runs
  lint, typecheck, test, and build.
- Run `npm run format` before pushing.

## Reporting security issues

Please don't open public issues for vulnerabilities — see [SECURITY.md](./SECURITY.md).
