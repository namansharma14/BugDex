import { MAX_LINE_LENGTH } from "./regex-safety.js";

export interface StructuralContext {
  content: string;
  lines: string[];
  language: string | undefined;
}

/** A named matcher coded in TS. Returns the first matching line (1-based). */
export type StructuralRule = (ctx: StructuralContext) => number | undefined;

/**
 * The registry of structural rules a signature can reference by name. Keep
 * these tight and language-aware to minimise false positives.
 */
export const STRUCTURAL_RULES: Record<string, StructuralRule> = {
  /**
   * Loose equality (`==` / `!=`) in JS/TS, ignoring strict `===` / `!==`.
   * More robust than a raw regex because it strips the strict forms first.
   */
  "loose-equality": (ctx) => {
    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];
      if (line.length > MAX_LINE_LENGTH) continue;
      const stripped = line.replace(/===|!==/g, "");
      if (/(^|[^=!<>])[=!]=(?!=)/.test(stripped)) return i + 1;
    }
    return undefined;
  },

  /** A bare `except:` in Python — swallows every error indiscriminately. */
  "python-bare-except": (ctx) => {
    for (let i = 0; i < ctx.lines.length; i++) {
      if (/^\s*except\s*:/.test(ctx.lines[i])) return i + 1;
    }
    return undefined;
  },
};
