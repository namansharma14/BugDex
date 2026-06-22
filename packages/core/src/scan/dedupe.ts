import type { Dex, Species } from "../schema/index.js";
import { matchFile } from "../matcher/matcher.js";
import type { Candidate } from "./candidate.js";

/**
 * Decide whether a candidate is already represented in the dex — i.e. it's an
 * *encounter*, not a new species (SPEC §7.4). Covered when an identical
 * signature already exists, or when an existing signature already catches the
 * candidate's snippet. Returns the covering species, or undefined if novel.
 */
export function findCoveringSpecies(candidate: Candidate, dex: Dex): Species | undefined {
  if (candidate.signature) {
    const target = JSON.stringify(candidate.signature);
    const bySignature = dex.species.find((s) =>
      s.signatures.some((sig) => JSON.stringify(sig) === target),
    );
    if (bySignature) return bySignature;
  }

  if (candidate.snippet) {
    const file = candidate.file ?? "candidate.txt";
    const matches = matchFile({ file, content: candidate.snippet, dex });
    if (matches.length > 0) {
      const covering = dex.species.find((s) => s.id === matches[0].speciesId);
      if (covering) return covering;
    }
  }

  return undefined;
}
