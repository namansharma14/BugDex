/**
 * BugDex taxonomy — the canonical vocabulary for the engine.
 *
 * This module is deliberately dependency-free (no zod, no storage) so it can
 * be imported anywhere without cycles. The zod schemas in `../schema` build
 * their validators on top of the const arrays exported here.
 */

/** The ten bug types BugDex classifies every species into. */
export const BUG_TYPES = [
  "null",
  "injection",
  "concurrency",
  "memory",
  "logic",
  "crypto",
  "auth",
  "resource",
  "type",
  "config",
] as const;
export type BugType = (typeof BUG_TYPES)[number];

/** Rarity tiers, ordered from most common to rarest. */
export const RARITIES = ["common", "uncommon", "rare", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

/** Lifecycle status of a catalogued species. */
export const STATUSES = ["caught", "recurring", "nemesis", "sealed"] as const;
export type Status = (typeof STATUSES)[number];

/** Severity scale, 1 (cosmetic) … 5 (RCE / auth bypass / secret leak). */
export const SEVERITIES = [1, 2, 3, 4, 5] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Display metadata for a bug type (used by the renderer and dashboard). */
export interface TaxonomyEntry {
  type: BugType;
  /** Short display label, e.g. "Null". */
  label: string;
  /** Plain-English summary of what the type covers. */
  covers: string;
  /** Stable hex color for badges/sprites. */
  color: string;
  /** Tabler outline icon name for the dashboard. */
  icon: string;
}

/** The stable palette + icon set for every bug type (see SPEC §4). */
export const TAXONOMY: Record<BugType, TaxonomyEntry> = {
  null: {
    type: "null",
    label: "Null",
    covers: "null/undefined/nil deref & access",
    color: "#8b5cf6",
    icon: "ti-circle-off",
  },
  injection: {
    type: "injection",
    label: "Injection",
    covers: "SQLi, XSS, command, path traversal, SSRF, template",
    color: "#ef4444",
    icon: "ti-syringe",
  },
  concurrency: {
    type: "concurrency",
    label: "Concurrency",
    covers: "races, deadlocks, TOCTOU, atomicity",
    color: "#f59e0b",
    icon: "ti-arrows-shuffle",
  },
  memory: {
    type: "memory",
    label: "Memory",
    covers: "leaks, overflow, use-after-free, OOB",
    color: "#fb7185",
    icon: "ti-stack-2",
  },
  logic: {
    type: "logic",
    label: "Logic",
    covers: "off-by-one, inverted condition, wrong operator",
    color: "#3b82f6",
    icon: "ti-logic-and",
  },
  crypto: {
    type: "crypto",
    label: "Crypto",
    covers: "weak hashing, hardcoded secrets, bad randomness",
    color: "#14b8a6",
    icon: "ti-key",
  },
  auth: {
    type: "auth",
    label: "Auth",
    covers: "missing authz, IDOR, broken access control",
    color: "#ec4899",
    icon: "ti-lock-access",
  },
  resource: {
    type: "resource",
    label: "Resource",
    covers: "unclosed handles/connections, leaked fds",
    color: "#22c55e",
    icon: "ti-plug-connected-x",
  },
  type: {
    type: "type",
    label: "Type",
    covers: "type confusion, unsafe cast, coercion",
    color: "#6b7280",
    icon: "ti-transform",
  },
  config: {
    type: "config",
    label: "Config",
    covers: "insecure defaults, exposed env, debug in prod",
    color: "#d97706",
    icon: "ti-settings-exclamation",
  },
};

/** XP multiplier per rarity (SPEC §5: common ×1 … legendary ×8). */
export const RARITY_XP_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 4,
  legendary: 8,
};

/** Runtime guard: is `value` one of the ten known bug types? */
export function isBugType(value: unknown): value is BugType {
  return typeof value === "string" && (BUG_TYPES as readonly string[]).includes(value);
}

/** Map a severity to its canonical rarity (SPEC §3). */
export function rarityForSeverity(severity: Severity): Rarity {
  switch (severity) {
    case 5:
      return "legendary";
    case 4:
      return "rare";
    case 3:
      return "uncommon";
    default:
      return "common"; // severity 1 | 2
  }
}

/** Inverse of {@link rarityForSeverity}: the severity range a rarity spans. */
export function severityRangeForRarity(rarity: Rarity): readonly [Severity, Severity] {
  switch (rarity) {
    case "legendary":
      return [5, 5];
    case "rare":
      return [4, 4];
    case "uncommon":
      return [3, 3];
    case "common":
      return [1, 2];
  }
}
