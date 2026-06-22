import chalk, { Chalk, type ChalkInstance } from "chalk";
import { TAXONOMY } from "../taxonomy/index.js";
import type { BugType, Rarity, Status } from "../taxonomy/index.js";

/**
 * Whether color should be used by default. Honours `NO_COLOR` and chalk's own
 * TTY/terminal detection (SPEC §4/§9). Checked at call time so it's testable.
 */
export function defaultColorEnabled(): boolean {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") return false;
  return chalk.level > 0;
}

const RARITY_FILLED: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  legendary: 4,
};
const RARITY_COLOR: Record<Rarity, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  legendary: "#f59e0b",
};

/**
 * A small, flair-aware styling surface. When `enabled` is false every method
 * returns plain text, so callers get identical structure with no ANSI codes —
 * which is exactly the `flair: "off"` / `NO_COLOR` path, and keeps tests simple.
 */
export interface Painter {
  enabled: boolean;
  c: ChalkInstance;
  type(type: BugType, text: string): string;
  rarityDots(rarity: Rarity): string;
  statusLabel(status: Status): string;
  heading(text: string): string;
  dim(text: string): string;
}

export function createPainter(enabled: boolean = defaultColorEnabled()): Painter {
  const level = (enabled ? Math.max(1, chalk.level) : 0) as 0 | 1 | 2 | 3;
  const c = new Chalk({ level });
  return {
    enabled,
    c,
    type: (type, text) => c.hex(TAXONOMY[type].color)(text),
    rarityDots: (rarity) => {
      const filled = RARITY_FILLED[rarity];
      return c.hex(RARITY_COLOR[rarity])("●".repeat(filled) + "○".repeat(4 - filled));
    },
    statusLabel: (status) => {
      switch (status) {
        case "nemesis":
          return c.bgRed.whiteBright(" NEMESIS ");
        case "sealed":
          return c.green("SEALED");
        case "recurring":
          return c.yellow("recurring");
        case "caught":
          return c.dim("caught");
      }
    },
    heading: (text) => c.bold(text),
    dim: (text) => c.dim(text),
  };
}
