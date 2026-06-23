# Launch copy

Paste-ready copy for launching **bugdex**. Swap in the real demo GIF link once
recorded. Stagger posts (HN → Reddit → X) over a day or two rather than all at once.

- Repo: https://github.com/namansharma14/bugdex
- npm: https://www.npmjs.com/package/bugdex

---

## Show HN

**Title**

```
Show HN: BugDex – a Pokédex for your codebase that remembers every bug you fix
```

**First comment**

```
Hi HN! I kept re-fixing the same *classes* of bugs across a codebase — and so did my teammates — so I built BugDex.

It's a bug *memory*, not a scanner. When you fix a bug you catalogue it as a "species" with the fix attached. After that, a fast, offline, deterministic matcher recognises that class of bug anywhere it reappears (written by anyone) and surfaces the fix you already wrote. It only speaks when confident, so there's no alert fatigue.

Two engines, deliberately split:
- Fast: LLM-free, offline, always-on. Only recognises what's already in your dex.
- Deep: on-demand. Discovers NEW species inside your own Claude Code session (/bugdex:scan).

The recurrence loop is gamified, but every mechanic maps to a real behaviour: the highest-XP move — permanently "sealing" a recurring Nemesis with a test or lint rule — is also the highest-value move in real life. `bugdex verify-seals` reverts the seal if the guard ever disappears, so it stays honest.

Ships three ways: a Claude Code plugin (+ marketplace), an npm CLI (`npx bugdex`), and a local Pokédex web dashboard. Everything runs locally; the dex is a committable JSON file, so a team inherits each other's bug memory.

MIT, Node 22+.
Repo: https://github.com/namansharma14/bugdex
npm: https://www.npmjs.com/package/bugdex

Honest scope: this is memory + recurrence + a bit of fun, not a CodeQL/Semgrep replacement. Feedback on the matcher and the species format very welcome.
```

---

## Reddit (r/SideProject, r/javascript, r/typescript, r/coolgithubprojects)

**Title**

```
I built BugDex – a "Pokédex for your codebase" that remembers every bug you fix (offline, MIT, Claude Code plugin + npm CLI)
```

**Body**

```
Every bug you fix becomes a catalogued "species" with its fix attached. Next time that *class* of bug shows up anywhere in the repo, a fast offline matcher recognises it and shows you the fix you already wrote — and it only speaks when it's confident, so it doesn't nag.

Two engines on purpose:
• Fast — deterministic, offline, always-on; recognises only what's in your dex.
• Deep — on-demand discovery of new species via your own Claude Code session.

The fun part (sealing a recurring "Nemesis" with a test/lint rule for XP + a badge) maps 1:1 to the genuinely useful engineering move. The dex is a committable JSON file, so your whole team inherits the bug memory.

Ships as a Claude Code plugin, an npm CLI (`npx bugdex`), and a local Pokédex dashboard with a generated creature sprite per bug type.

Repo (MIT): https://github.com/namansharma14/bugdex
npm: https://www.npmjs.com/package/bugdex

Feedback welcome — especially whether the gamification feels useful or gimmicky.
```

---

## X / Bluesky thread

```
1/ I shipped BugDex 🐛📕 — a Pokédex for your codebase.

Every bug you fix becomes a catalogued "species" with its fix attached. When that class of bug reappears anywhere, BugDex recognises it instantly and shows the fix you already wrote.

Offline. MIT. `npx bugdex` 🧵

2/ Two engines, on purpose:

⚡ Fast — deterministic, offline, always-on. Only recognises bugs already in your dex, only speaks when confident. No alert fatigue.

🔍 Deep — on-demand discovery of NEW species via your own Claude Code session (/bugdex:scan).

3/ It's gamified, but every mechanic earns its keep.

The highest-XP move — sealing a recurring "Nemesis" with a real test or lint rule — is also the highest-value move in real life. `bugdex verify-seals` reverts it if the guard ever vanishes.

4/ Ships 3 ways:
• Claude Code plugin (+ marketplace)
• npm CLI: npx bugdex
• a local Pokédex dashboard with a generated creature sprite per species

The dex is a committable JSON file → your whole team inherits the bug memory.

5/ MIT, Node 22+, all local.

⭐ if it made you smile:
https://github.com/namansharma14/bugdex

#ClaudeCode #buildinpublic #devtools
```

---

## Claude Code Discord / dev.to one-liner

```
Just released BugDex — a Claude Code plugin (+ npm CLI) that catalogues every bug you fix as a "species" and recognises it instantly when that class reappears. Offline fast-matcher + on-demand /bugdex:scan discovery. MIT: https://github.com/namansharma14/bugdex
```

---

## Two things that matter more than the copy

- **Record a 15–20s demo GIF** (`catch → match → seal` in the terminal + a 3s
  dashboard clip) and put it at the very top of the README. Single biggest driver
  of stars now that installs work — people decide in seconds.
- **Timing:** post Show HN Tue–Thu, ~9–11am ET. Don't cross-post everywhere the
  same hour — stagger the channels and reply to every comment quickly.
