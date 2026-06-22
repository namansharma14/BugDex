import { describe, it, expect } from "vitest";
import {
  BUG_TYPES,
  RARITIES,
  STATUSES,
  TAXONOMY,
  RARITY_XP_MULTIPLIER,
  isBugType,
  rarityForSeverity,
  severityRangeForRarity,
} from "../src/taxonomy/index.js";

describe("taxonomy", () => {
  it("defines exactly ten distinct bug types", () => {
    expect(BUG_TYPES).toHaveLength(10);
    expect(new Set(BUG_TYPES).size).toBe(10);
  });

  it("has display metadata for every type", () => {
    for (const type of BUG_TYPES) {
      const entry = TAXONOMY[type];
      expect(entry.type).toBe(type);
      expect(entry.label).toBeTruthy();
      expect(entry.covers).toBeTruthy();
      expect(entry.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(entry.icon).toMatch(/^ti-/);
    }
  });

  it("maps severity to rarity per SPEC §3", () => {
    expect(rarityForSeverity(5)).toBe("legendary");
    expect(rarityForSeverity(4)).toBe("rare");
    expect(rarityForSeverity(3)).toBe("uncommon");
    expect(rarityForSeverity(2)).toBe("common");
    expect(rarityForSeverity(1)).toBe("common");
  });

  it("keeps rarity<->severity ranges consistent", () => {
    for (const rarity of RARITIES) {
      const [lo, hi] = severityRangeForRarity(rarity);
      expect(rarityForSeverity(lo)).toBe(rarity);
      expect(rarityForSeverity(hi)).toBe(rarity);
    }
  });

  it("assigns an XP multiplier per rarity", () => {
    expect(RARITY_XP_MULTIPLIER.common).toBe(1);
    expect(RARITY_XP_MULTIPLIER.uncommon).toBe(2);
    expect(RARITY_XP_MULTIPLIER.rare).toBe(4);
    expect(RARITY_XP_MULTIPLIER.legendary).toBe(8);
  });

  it("guards bug types at runtime", () => {
    expect(isBugType("injection")).toBe(true);
    expect(isBugType("telepathy")).toBe(false);
    expect(isBugType(42)).toBe(false);
  });

  it("orders statuses from caught to sealed", () => {
    expect(STATUSES).toEqual(["caught", "recurring", "nemesis", "sealed"]);
  });
});
