# Security Policy

BugDex is built to be safe by default: everything runs locally, the fast layer is
LLM-free, dex content is treated as **data and is never executed**, and user-supplied
regexes are defended against ReDoS. Code only leaves your machine via your own Claude
Code session during an explicit `/bugdex:scan`.

## Reporting a vulnerability

Please report security issues **privately**:

1. Preferred: the repository's **Security** tab → **Report a vulnerability**
   (a private GitHub advisory).
2. Or email **naman.work13@gmail.com** with details and reproduction steps.

Please do not open a public issue for security problems. We'll acknowledge your
report, investigate, and credit you (unless you'd prefer to remain anonymous).

## Supported versions

BugDex is pre-1.0; security fixes land on the latest released version.
