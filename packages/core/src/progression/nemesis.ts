import type { Status } from "../taxonomy/index.js";

export interface StatusInput {
  /** Number of recorded encounters. */
  encounters: number;
  /** Whether the species carries a seal. */
  sealed: boolean;
  /** Encounters required to become a Nemesis. */
  nemesisThreshold: number;
}

/**
 * Derive a species' lifecycle status from its encounter count (SPEC §5):
 * sealed wins outright; ≥ threshold → nemesis; seen again (≥2) → recurring;
 * otherwise caught.
 */
export function computeStatus({ encounters, sealed, nemesisThreshold }: StatusInput): Status {
  if (sealed) return "sealed";
  if (encounters >= nemesisThreshold) return "nemesis";
  if (encounters >= 2) return "recurring";
  return "caught";
}
