/**
 * `bugdex dashboard` — the Pokédex web UI + local server.
 *
 * The full implementation lands in milestone M6. This placeholder keeps the
 * `/bugdex:dashboard` command from hard-failing in the meantime.
 */
export async function runDashboard(): Promise<void> {
  process.stdout.write(
    [
      "bugdex dashboard — the Pokédex web UI arrives in milestone M6.",
      "For now, browse your dex in the terminal with `bugdex dex` and `bugdex card`.",
      "",
    ].join("\n"),
  );
}
