# BugDex — Build Prompt for Claude Code

> Paste this whole file into Claude Code as your opening prompt (or commit it as `SPEC.md` and say "build the project described in SPEC.md"). It is the authoritative spec. Build it incrementally in my current git repository.

---

## 0. Working agreement (read first)

- **Operate in this repo.** If there's no git repo here, `git init`. Commit in logical chunks using Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). One commit (or small PR-sized batch) per milestone in §10.
- **Verify the harness specifics before you write them.** The Claude Code plugin / hook / subagent / slash-command schemas change. Before creating any file under `.claude-plugin/`, `hooks/`, `commands/`, or `agents/`, check the current docs and adjust the templates in this spec if they've drifted:
  - Plugins: https://docs.claude.com/en/docs/claude-code/overview (and the plugin / marketplace pages)
  - Hooks reference: https://code.claude.com/docs/en/hooks
  - Study the official `security-guidance` and `plugin-dev` plugins in `anthropics/claude-plugins-official` and `anthropics/claude-code` as reference implementations.
- **Pause at milestone boundaries** (end of each §10 phase) for me to review. Don't build all phases in one shot.
- **Ask, don't guess, on the open questions in §11.** Surface them early.
- **Stay in scope.** Honour the non-goals in §9. Don't gold-plate.
- **Tests are part of "done."** Every milestone with logic ships with passing tests. Run them before committing.

---

## 1. What BugDex is

BugDex is **a bug _memory_, not a bug scanner.** It's a Pokédex for a codebase: every bug a developer catches and fixes becomes a catalogued "species" with its fix attached. The next time that _class_ of bug appears — written by anyone, anywhere in the repo — BugDex recognises it instantly and surfaces the known fix. New-bug discovery is gamified into a progression system, but **every game mechanic maps to a real engineering behaviour**, and the endgame is permanently _sealing_ bug classes out of the codebase.

One-line pitch: _"Never re-fight a bug you've already beaten — and make your whole team inherit the win."_

### Why this design (the load-bearing decisions)

1. **Two engines, deliberately split.** A _fast_ engine (deterministic, free, offline, always-on) only recognises bugs already in the dex and only speaks when confident. A _deep_ engine (LLM-backed, on-demand) discovers _new_ species. This split is what avoids the alert-fatigue death that kills passive scanners.
2. **The dex is the product.** A committed, shared `.bugdex/` directory turns one person's debugging into team/institutional memory. New hires inherit it for free.
3. **Gamification must not be cringe.** Every XP source corresponds to real value; the highest-value move in the game (sealing a recurring "Nemesis" with a test or lint rule) is the highest-value move in real life. Flair is configurable down to a single status line.

---

## 2. Repository layout (monorepo)

The repo is **also a Claude Code marketplace** (so people can `/plugin marketplace add <you>/bugdex` then `/plugin install bugdex@bugdex`).

```
bugdex/
├── .claude-plugin/
│   └── marketplace.json              # repo = marketplace catalog
├── plugins/
│   └── bugdex/                       # the Claude Code plugin (thin adapter)
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── commands/                 # *.md slash commands → /bugdex:scan etc.
│       ├── agents/
│       │   └── bug-hunter.md         # read-only discovery subagent
│       ├── hooks/
│       │   └── hooks.json
│       ├── skills/                   # OPTIONAL (see §7.5)
│       ├── bin/
│       │   └── bugdex.cjs            # BUILT artifact: bundled core CLI (committed)
│       └── README.md
├── packages/
│   └── core/                         # the engine + CLI, also publishable to npm
│       ├── src/
│       │   ├── cli.ts                # commander/cac entrypoint
│       │   ├── schema/               # zod schemas (species, trainer, signature, config)
│       │   ├── taxonomy/             # bug types, colors, icons
│       │   ├── storage/              # read/write/merge .bugdex/
│       │   ├── matcher/              # FAST deterministic matcher
│       │   ├── scan/                 # deep-scan IO (collect diff, persist candidates)
│       │   ├── progression/          # XP, ranks, nemesis, sealing
│       │   ├── render/               # terminal rendering (chalk/boxen), flair-aware
│       │   └── dashboard/            # local server that serves the static UI + tiny read/write API
│       ├── tests/
│       ├── fixtures/                 # seeded buggy snippets + a sample dex for demos/tests
│       └── package.json
├── apps/
│   └── dashboard/                    # Pokédex web UI (Vite + React + TS, static build)
│       └── src/
├── package.json                      # workspaces (npm or pnpm)
├── README.md                         # GitHub landing page (with screenshots)
└── LICENSE
```

**Why the bundled `bin/bugdex.cjs`:** installed plugins are copied to a cache and can't reference files outside their own directory, and we don't want `npx` network latency on every keystroke-batch. So the plugin ships a self-contained bundled build of the core that hooks invoke as `node "${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs" …`. The same core is published to npm for the standalone CLI and a future Codex adapter.

---

## 3. Data model (`packages/core/src/schema`, validated with zod)

Stored in the **target repo's** `.bugdex/` directory:

- `.bugdex/dex.json` — the species catalogue. **Committable / team-shared.**
- `.bugdex/config.json` — flair level, enabled types, confidence threshold, languages.
- `.bugdex/trainer.local.json` — per-user progress. **gitignored by default** (see §11 for the team-leaderboard option).

```ts
type BugType =
  | "null" | "injection" | "concurrency" | "memory" | "logic"
  | "crypto" | "auth" | "resource" | "type" | "config";

type Rarity = "common" | "uncommon" | "rare" | "legendary";

type Status = "caught" | "recurring" | "nemesis" | "sealed";

type Signature =
  | { kind: "regex"; pattern: string; flags?: string; languages?: string[] }
  | { kind: "structural"; rule: string; languages?: string[] }   // a named matcher in code
  | { kind: "ast"; language: string; query: string }              // tree-sitter query (later phase)
  | { kind: "fingerprint"; model: string; vector: number[]; threshold: number }; // semantic (stretch)

interface Encounter {
  at: string;            // ISO timestamp
  file: string;
  line?: number;
  commit?: string;
  via: "matcher" | "scan" | "manual";
  resolvedBy?: string;
}

interface Species {
  id: string;            // stable slug, e.g. "voidling"
  dexNumber: number;     // 47
  name: string;          // codename, e.g. "VOIDLING" (auto-generated, fun, memorable)
  commonName: string;    // plain English, e.g. "Unguarded null dereference"
  type: BugType;
  rarity: Rarity;
  severity: 1 | 2 | 3 | 4 | 5;
  description: string;   // one-line "dossier"
  cwe?: string;          // optional CWE id for security types
  signatures: Signature[];
  fix: { summary: string; patch?: string; explanation?: string };
  status: Status;
  seal?: { kind: "test" | "lint-rule" | "type" | "assertion"; reference: string; sealedAt: string };
  encounters: Encounter[];
  firstSeen: string;
  lastSeen: string;
  tags: string[];
  discoveredBy?: string;
}

interface Dex {
  version: 1;
  species: Species[];
}

interface Trainer {
  name: string;
  xp: number;
  rank: string;          // derived (see §5)
  title: string;         // derived flavor title
  streak: { current: number; longest: number; lastActive: string };
  stats: {
    caught: number;      // distinct species
    encounters: number;  // total sightings handled
    sealed: number;      // nemeses sealed
    byType: Record<BugType, number>;
  };
  badges: { id: string; label: string; earnedAt: string }[];
  history: { at: string; kind: string; xp: number; speciesId?: string }[];
}
```

**Rarity ↔ severity:** legendary = sev 5 (RCE, auth bypass, secret leak), rare = sev 4, uncommon = sev 3, common = sev 1–2.

**Signature safety:** dex.json is shared/untrusted-ish. Never `eval` it. Compile regexes defensively against ReDoS (length cap + per-match timeout, or a safe-regex check). Validate everything with zod on load; reject/quarantine malformed entries.

---

## 4. Bug taxonomy (`packages/core/src/taxonomy`)

Ten types, each with a display color (map to a stable palette) and an icon name (Tabler outline) for the dashboard:

| Type | Covers | Suggested color / icon |
|---|---|---|
| `null` | null/undefined/nil deref & access | purple / `ti-circle-off` |
| `injection` | SQLi, XSS, command, path traversal, SSRF, template | red / `ti-syringe` |
| `concurrency` | races, deadlocks, TOCTOU, atomicity | amber / `ti-arrows-shuffle` |
| `memory` | leaks, overflow, use-after-free, OOB | coral / `ti-stack-2` |
| `logic` | off-by-one, inverted condition, wrong operator | blue / `ti-logic-and` |
| `crypto` | weak hashing, hardcoded secrets, bad randomness | teal / `ti-key` |
| `auth` | missing authz, IDOR, broken access control | pink / `ti-lock-access` |
| `resource` | unclosed handles/connections, leaked fds | green / `ti-plug-connected-x` |
| `type` | type confusion, unsafe cast, coercion | gray / `ti-transform` |
| `config` | insecure defaults, exposed env, debug in prod | amber / `ti-settings-exclamation` |

---

## 5. Progression engine (`packages/core/src/progression`)

**XP sources (every one tied to real value):**

- Discover a new species via scan: `+50 × rarity multiplier` (common ×1, uncommon ×2, rare ×4, legendary ×8).
- Manual catch (`/bugdex:catch`): `+30`.
- Battle won (fast matcher flagged a recurrence and the dev fixed it): `+15`.
- **Seal a Nemesis** (register a permanent guard): `+120` + a badge. This is the apex move.
- Daily streak: small bonus, decays if inactive.

**Ranks (gated partly on seals so grinding alone can't max you out):**

| Rank | Title | Requires |
|---|---|---|
| 1 | Rookie Trainer | 0 XP |
| 2 | Bug Catcher | 200 XP |
| 3 | Ace Trainer | 600 XP |
| 4 | Gym Leader | 1200 XP **and** ≥1 seal |
| 5 | Elite Four | 2400 XP **and** ≥5 seals |
| 6 | Champion | 4000 XP **and** ≥10 seals **and** "regional dex complete" (≥1 caught species in every type) |

**Nemesis & sealing loop:**

- A species with `encounters.length ≥ nemesisThreshold` (default 3) and not sealed → `status = "nemesis"`.
- Sealing requires a real guard: `/bugdex:seal <id> --kind test --ref tests/null_guard.test.ts` writes `seal{}` and flips status to `sealed`.
- `bugdex verify-seals` (optional command) checks the referenced guard still exists; if a sealed species' guard vanishes, it reverts toward `nemesis` — keeping the gamification honest.

---

## 6. The fast matcher (`packages/core/src/matcher`) — the always-on layer

**Contract:** deterministic, offline, fast (target < 150 ms), **never calls an LLM, never blocks an edit, only surfaces high-confidence hits by default.**

Behaviour:

1. Input: a file path (from the hook's stdin JSON `tool_input.file_path`) or an explicit path/glob.
2. Load `dex.json` signatures; filter by file language.
3. Match using, in order of cost: `regex` → named `structural` rules → (later) `ast` queries → (stretch) `fingerprint` similarity.
4. Confidence: exact signature = **high**; fingerprint above threshold = **medium**. Default surfaces **high only** (configurable in `config.json`).
5. Output JSON: `{ matches: [{ speciesId, name, type, file, line, confidence, fix: { summary } }] }`.
6. Record an `Encounter` (via `"matcher"`) on a confirmed surfaced match (debounced so re-saving the same file doesn't spam encounters).

The PostToolUse hook turns a high-confidence match into `hookSpecificOutput.additionalContext` so Claude tells the dev inline, e.g.:

> ⚠️ **BugDex:** that change matches **VOIDLING** (Null-type, caught ×6 in this repo). Known fix: _guard clause before deref_. This is a Nemesis — consider `/bugdex:seal voidling` with a test.

---

## 7. Claude Code plugin (`plugins/bugdex/`) — thin adapter over the core

> Verify each schema below against current docs before writing (see §0). These reflect the model as of this spec.

### 7.1 `plugins/bugdex/.claude-plugin/plugin.json`

```json
{
  "name": "bugdex",
  "version": "0.1.0",
  "description": "A Pokédex for your codebase: catalogue every bug you fix, recognise recurrences instantly with the saved fix, and gamify the hunt.",
  "author": { "name": "<your name>", "email": "<you@example.com>" },
  "repository": "https://github.com/<you>/bugdex",
  "keywords": ["security", "bugs", "vulnerabilities", "code-review", "gamification"],
  "license": "MIT"
}
```

### 7.2 `.claude-plugin/marketplace.json` (repo root)

```json
{
  "name": "bugdex",
  "owner": { "name": "<your name>", "email": "<you@example.com>" },
  "version": "0.1.0",
  "description": "BugDex — gamified bug & vulnerability memory for Claude Code.",
  "plugins": [
    { "name": "bugdex", "source": "./plugins/bugdex", "description": "Catalogue, recognise, and gamify bug fixing." }
  ]
}
```

### 7.3 `plugins/bugdex/hooks/hooks.json`

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs\" match --hook-input --json", "timeout": 10 }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          { "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs\" card --hook", "timeout": 10 }
        ]
      }
    ]
  }
}
```

- `match --hook-input` reads the hook JSON on stdin, extracts the file path, runs the fast matcher, and emits `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"…"}}` only when there's a high-confidence hit (otherwise exits 0 silently). It must **never** exit 2 / block.
- `card --hook` emits a compact trainer card + any active Nemeses as `additionalContext` at session start. Keep it fast and quiet (respect flair).

### 7.4 Slash commands (`plugins/bugdex/commands/*.md`) — namespaced `/bugdex:<name>`

Ship at least: `scan`, `dex`, `catch`, `seal`, `card`, `dashboard`.

Example — `commands/scan.md`:

```md
---
description: Hunt the current diff (or a path) for NEW bug species and add confirmed ones to the BugDex.
argument-hint: "[path | --diff]"
---

Run a deep bug hunt.

1. Collect: run `node "${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs" scan $ARGUMENTS --collect`
   (defaults to `--diff` if no argument). This prints target files/diff plus a summary of existing dex signatures, as JSON.
2. Analyse with the `bug-hunter` subagent to find genuine NEW bugs/vulnerabilities not already represented by an existing signature.
3. De-duplicate every candidate against existing species (a candidate that already matches an existing signature is an *encounter*, not a new species).
4. Present findings as a numbered list: name · type · severity · file:line · proposed fix.
5. On my confirmation, persist with `node "${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs" catch --from-scan <json>` and report XP/rank changes.
```

### 7.5 Subagent (`plugins/bugdex/agents/bug-hunter.md`) — read-only

```md
---
name: bug-hunter
description: Read-only specialist that finds and classifies NEW bug/vulnerability species in a diff, assigns a BugDex type and severity, proposes a fix, and drafts a reusable signature. Use for deep on-demand scans.
tools: Read, Grep, Glob
---

You are the BugDex bug-hunter. You READ ONLY — you never edit code, you report.

For the supplied diff/files:
- Identify genuine bugs and security vulnerabilities (ignore style nits and subjective preferences).
- Classify each into exactly ONE type: null | injection | concurrency | memory | logic | crypto | auth | resource | type | config.
- Assign severity 1–5 (5 = RCE / auth bypass / secret leak) and the matching rarity.
- Write a one-line dossier, a memorable codename, and a plain-English common name.
- Propose a concrete fix: a summary plus a minimal patch.
- Draft the most precise signature you can (prefer a tight regex or a named structural rule) that re-catches this CLASS with minimal false positives.
- Skip anything already covered by an existing signature in the provided dex summary.

Output STRICT JSON only (no prose, no fences) matching the candidate schema.
```

> Note: keep the subagent's tools read-only (no `Write`/`Bash`) so discovery can never mutate code — the CLI does all persistence. This is a deliberate safety boundary.

### 7.6 Optional skill (`plugins/bugdex/skills/bugdex/SKILL.md`)

A small skill teaching Claude _when_ to reach for BugDex (e.g., "after fixing a bug, offer to `/bugdex:catch` it"; "when a recurrence is flagged, offer to seal it"). Stretch goal — keep it short and behavioural.

---

## 8. Dashboard (`apps/dashboard`) — the Pokédex look

`bugdex dashboard [--port 4317]` starts a local server (in `core/src/dashboard`) that serves the static React build and exposes a tiny read/mostly-write JSON API over `.bugdex/`.

Aesthetic (match the concept mock): red Pokédex device chrome, dark entry screen with a generated "sprite" per species, green sub-screen with stat bars, type badges in the taxonomy colors, rarity dots, status (incl. a red **NEMESIS** pill), and the known fix. Plus:

- A **dex grid** (filter by type / rarity / status; show caught vs undiscovered slots).
- A **trainer card** with rank, title, XP bar to next rank, streak, badges.
- A **"regional dex completion"** meter (coverage across the 10 types).
- A **Nemesis board** with one-click "how to seal" guidance.

Constraints: Vite + React + TS. Flat design, light/dark aware, no `localStorage` (state lives in `.bugdex/` via the API). Keep it a static build the CLI can serve offline.

---

## 9. Non-goals & guardrails

- **Not a replacement for full SAST** (CodeQL/Semgrep). BugDex is memory + recurrence + fun. (A future importer for external findings is a stretch goal, not v1.)
- **Privacy-first.** Everything is local. No telemetry. Code never leaves the machine except via the user's _own_ Claude Code session during an explicit `/bugdex:scan` — no separate API keys, no background uploads.
- **The fast layer is LLM-free** (free, offline, instant).
- **Never noisy, never blocking.** High-confidence only by default; flair configurable to a single line; hooks never exit 2.
- **Hooks run with the user's full permissions and no sandbox** — keep `bin/bugdex.cjs` trusted, treat dex content as data (never executed), and defend regex against ReDoS.

---

## 10. Build plan (milestones — pause for review after each)

**M0 — Scaffold.** Monorepo + workspaces, TS config, eslint/prettier, vitest, `tsup` build for the core bundle, `LICENSE`, skeleton `README`. `git init` + first commit.
_Done when:_ `npm install` + `npm run build` + `npm test` all succeed on an empty test.

**M1 — Core data model & storage.** zod schemas (§3), taxonomy (§4), `bugdex init` (creates `.bugdex/`, config, gitignores trainer), load/save/merge with validation.
_Done when:_ `bugdex init` produces a valid `.bugdex/`; round-trip load/save is tested; malformed entries are quarantined, not crashing.

**M2 — Fast matcher + catch/seal CLI.** Matcher (§6) with regex + structural rules; `catch`, `seal`, `dex`, `stats` commands; encounter recording + debounce; progression engine (§5) wired to XP/rank/nemesis. Ship the seeded `fixtures/` dex.
_Done when:_ against fixtures, the matcher flags known species with the right confidence and zero crashes; XP/rank/nemesis transitions are unit-tested; sealing flips status and grants the badge.

**M3 — Claude Code plugin adapter.** `plugin.json`, `marketplace.json`, `hooks/hooks.json`, the `commands/*.md`, `agents/bug-hunter.md`, and the `match --hook-input` / `card --hook` modes. Build + copy the core bundle to `plugins/bugdex/bin/bugdex.cjs`.
_Done when:_ installing the plugin locally, editing a file that matches a fixture species surfaces the known fix inline; `/bugdex:dex` and `/bugdex:card` work; the hook never blocks. (Verify schemas against live docs first.)

**M4 — Terminal rendering & flair.** `render/` with chalk/boxen; `bugdex card` and `bugdex dex` get the Pokédex flair; `config.json` flair levels `high | medium | off`; honour `NO_COLOR`.
_Done when:_ all three flair levels render correctly and `off` is a quiet single line.

**M5 — Deep discovery loop.** `scan --collect` (gather diff + dex summary), the `--from-scan` persistence path, candidate de-duplication against existing signatures, auto-generated signatures for confirmed species.
_Done when:_ an end-to-end `/bugdex:scan` on a fixture diff proposes a new species, de-dupes correctly, and on confirm writes a valid entry with a working signature that the fast matcher then recognises.

**M6 — Pokédex dashboard.** The web UI (§8) + the local server/API.
_Done when:_ `bugdex dashboard` serves the dex grid, entry detail (Pokédex styling), trainer card, completion meter, and Nemesis board, reading/writing `.bugdex/`.

**M7 — Docs, polish, publish.** Full `README` (what/why/install for both plugin and standalone CLI, screenshots/GIF of the dashboard), `plugins/bugdex/README.md`, `verify-seals`, `package.json` metadata for npm, and a GitHub Actions workflow (lint + test + build, and conventional-commit version bump for the marketplace).
_Done when:_ a clean clone → install → build → test passes in CI, and the README walks a new user from zero to first caught bug.

---

## 11. Open questions — resolved

1. **npm package name / scope** → `bugdex` (unscoped).
2. **License** → MIT.
3. **Min Node version** → 22 LTS.
4. **Trainer file: personal or team?** → Personal default (`trainer.local.json` gitignored); opt-in `--team` mode still built.
5. **Initial language coverage for matching** → TS/JS + Python (regex/structural); AST (tree-sitter) deferred to a later phase.
6. **Semantic fingerprint engine** → off-by-default stretch (keeps v1 fully offline/free).

---

## 12. Definition of done (whole project)

A developer can: `/plugin marketplace add <me>/bugdex` → `/plugin install bugdex@bugdex` → `bugdex init`, then while they work the fast layer quietly flags recurrences with saved fixes, `/bugdex:scan` discovers and catalogues new species, `/bugdex:seal` converts recurring Nemeses into permanent guards (earning rank), and `bugdex dashboard` shows a genuinely fun Pokédex of everything their codebase has taught them — all offline-first, private, and low-noise.
