# Changelog

All notable changes to **bugdex** are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-23

First public release.

### Added

- **Fast matcher** — deterministic, offline recognition of catalogued bug
  "species" with the saved fix attached; signatures are defended against ReDoS.
- **Deep discovery** — `/bugdex:scan` finds new species via the read-only
  `bug-hunter` Claude Code subagent.
- **Progression** — XP, seal-gated ranks, Nemesis tracking, and the
  `seal` / `verify-seals` lifecycle that keeps gamification honest.
- **Claude Code plugin** — PostToolUse match-on-edit and a SessionStart trainer
  card, six namespaced slash commands, shipped as a marketplace.
- **CLI** (`bugdex`) — `init`, `catch`, `match`, `seal`, `dex`, `card`, `stats`,
  `scan`, `dashboard`, `verify-seals`.
- **Pokédex dashboard** — single-file React UI plus a local JSON API, with a
  generated creature sprite per species.

[0.1.0]: https://github.com/namansharma14/bugdex/releases/tag/v0.1.0
