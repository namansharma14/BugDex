import type { Flair } from "../schema/index.js";

/** A CLI `--flair` override wins if valid; otherwise the config value stands. */
export function resolveFlair(configFlair: Flair, override?: string): Flair {
  if (override === "high" || override === "medium" || override === "off") return override;
  return configFlair;
}
