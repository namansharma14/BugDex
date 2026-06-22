/**
 * `bugdex scan` — deep on-demand discovery of NEW species.
 *
 * The full loop (collect diff + dex summary → bug-hunter subagent → de-dupe →
 * persist) lands in milestone M5. This placeholder keeps the `/bugdex:scan`
 * command from hard-failing in the meantime.
 */
export async function runScan(): Promise<void> {
  process.stdout.write(
    [
      "bugdex scan — the deep discovery loop arrives in milestone M5.",
      "For now: catalogue bugs with `bugdex catch`, and the fast matcher",
      "(`bugdex match`) will recognise recurrences automatically.",
      "",
    ].join("\n"),
  );
}
