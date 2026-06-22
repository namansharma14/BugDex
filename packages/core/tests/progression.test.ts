import { describe, it, expect } from "vitest";
import {
  discoverXp,
  eventXp,
  RANKS,
  deriveRank,
  nextRank,
  computeStats,
  regionalDexComplete,
  computeStatus,
  updateStreak,
  generateCodename,
  slugify,
  uniqueId,
  applyEvent,
} from "../src/progression/index.js";
import { ROOKIE_RANK, ROOKIE_TITLE, defaultTrainer } from "../src/storage/defaults.js";
import { BUG_TYPES } from "../src/taxonomy/index.js";
import type { Dex } from "../src/schema/index.js";
import { buildSpecies, enc } from "./helpers.js";

describe("xp", () => {
  it("scales discovery XP by rarity", () => {
    expect(discoverXp("common")).toBe(50);
    expect(discoverXp("uncommon")).toBe(100);
    expect(discoverXp("rare")).toBe(200);
    expect(discoverXp("legendary")).toBe(400);
  });

  it("rewards each event kind correctly", () => {
    const species = buildSpecies({ rarity: "legendary" });
    expect(eventXp({ kind: "catch", species, source: "manual" })).toBe(30);
    expect(eventXp({ kind: "catch", species, source: "scan" })).toBe(400);
    expect(eventXp({ kind: "battle", species })).toBe(15);
    expect(eventXp({ kind: "seal", species })).toBe(120);
  });
});

describe("ranks", () => {
  it("gates upper ranks on seals and the regional dex", () => {
    expect(deriveRank({ xp: 0, seals: 0, regionalDexComplete: false }).title).toBe(
      "Rookie Trainer",
    );
    expect(deriveRank({ xp: 250, seals: 0, regionalDexComplete: false }).title).toBe("Bug Catcher");
    // 1200 XP but no seal → stuck at Ace Trainer, not Gym Leader.
    expect(deriveRank({ xp: 1200, seals: 0, regionalDexComplete: false }).title).toBe(
      "Ace Trainer",
    );
    expect(deriveRank({ xp: 1200, seals: 1, regionalDexComplete: false }).title).toBe("Gym Leader");
    // Champion needs the regional dex too.
    expect(deriveRank({ xp: 5000, seals: 10, regionalDexComplete: false }).title).toBe(
      "Elite Four",
    );
    expect(deriveRank({ xp: 5000, seals: 10, regionalDexComplete: true }).title).toBe("Champion");
  });

  it("reports the next rank to chase", () => {
    expect(nextRank({ xp: 0, seals: 0, regionalDexComplete: false })?.title).toBe("Bug Catcher");
    expect(nextRank({ xp: 5000, seals: 10, regionalDexComplete: true })).toBeUndefined();
  });

  it("keeps the default trainer aligned with rank 1", () => {
    expect(ROOKIE_RANK).toBe(RANKS[0].title);
    expect(ROOKIE_TITLE).toBe(RANKS[0].flavor);
  });
});

describe("nemesis status", () => {
  it("derives status from encounter count", () => {
    const t = 3;
    expect(computeStatus({ encounters: 0, sealed: false, nemesisThreshold: t })).toBe("caught");
    expect(computeStatus({ encounters: 1, sealed: false, nemesisThreshold: t })).toBe("caught");
    expect(computeStatus({ encounters: 2, sealed: false, nemesisThreshold: t })).toBe("recurring");
    expect(computeStatus({ encounters: 3, sealed: false, nemesisThreshold: t })).toBe("nemesis");
    expect(computeStatus({ encounters: 9, sealed: true, nemesisThreshold: t })).toBe("sealed");
  });
});

describe("stats", () => {
  it("projects caught/encounters/sealed/byType from the dex", () => {
    const dex: Dex = {
      version: 1,
      species: [
        buildSpecies({
          id: "a",
          type: "null",
          encounters: [enc("2026-01-01T00:00:00.000Z"), enc("2026-01-02T00:00:00.000Z")],
        }),
        buildSpecies({
          id: "b",
          type: "crypto",
          status: "sealed",
          seal: { kind: "test", reference: "t", sealedAt: "2026-01-01T00:00:00.000Z" },
        }),
      ],
    };
    const stats = computeStats(dex);
    expect(stats.caught).toBe(2);
    expect(stats.encounters).toBe(2);
    expect(stats.sealed).toBe(1);
    expect(stats.byType.null).toBe(1);
    expect(stats.byType.crypto).toBe(1);
    expect(stats.byType.auth).toBe(0);
  });

  it("detects a complete regional dex", () => {
    expect(regionalDexComplete({ version: 1, species: [buildSpecies({ type: "null" })] })).toBe(
      false,
    );
    const full: Dex = {
      version: 1,
      species: BUG_TYPES.map((type, i) => buildSpecies({ id: `s${i}`, dexNumber: i + 1, type })),
    };
    expect(regionalDexComplete(full)).toBe(true);
  });
});

describe("streak", () => {
  const base = { current: 2, longest: 5, lastActive: "2026-06-01T00:00:00.000Z" };

  it("does not advance twice in one day", () => {
    const r = updateStreak(base, new Date("2026-06-01T20:00:00.000Z"));
    expect(r.advanced).toBe(false);
    expect(r.streak.current).toBe(2);
  });

  it("extends on the next day", () => {
    const r = updateStreak(base, new Date("2026-06-02T08:00:00.000Z"));
    expect(r.advanced).toBe(true);
    expect(r.streak.current).toBe(3);
  });

  it("resets after a gap but keeps the longest", () => {
    const r = updateStreak(base, new Date("2026-06-05T08:00:00.000Z"));
    expect(r.streak.current).toBe(1);
    expect(r.streak.longest).toBe(5);
    expect(r.advanced).toBe(true);
  });
});

describe("codename & ids", () => {
  it("generates deterministic uppercase codenames", () => {
    expect(generateCodename("seed")).toBe(generateCodename("seed"));
    expect(generateCodename("seed")).toMatch(/^[A-Z]+$/);
  });

  it("slugifies text", () => {
    expect(slugify("Unguarded Null Dereference!")).toBe("unguarded-null-dereference");
    expect(slugify("  --Weird__Name--  ")).toBe("weird-name");
    expect(slugify("")).toBe("species");
  });

  it("disambiguates ids", () => {
    expect(uniqueId("voidling", new Set())).toBe("voidling");
    expect(uniqueId("voidling", new Set(["voidling"]))).toBe("voidling-2");
    expect(uniqueId("voidling", new Set(["voidling", "voidling-2"]))).toBe("voidling-3");
  });
});

describe("applyEvent", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("awards manual catch XP and updates dex-derived stats", () => {
    const trainer = defaultTrainer("Ash");
    trainer.streak.lastActive = now.toISOString(); // suppress streak bonus
    const species = buildSpecies({ id: "x", type: "null", rarity: "common" });
    const result = applyEvent(
      trainer,
      { kind: "catch", species, source: "manual" },
      { version: 1, species: [species] },
      now,
    );
    expect(result.xpAwarded).toBe(30);
    expect(result.trainer.xp).toBe(30);
    expect(result.trainer.stats.caught).toBe(1);
    expect(result.trainer.stats.byType.null).toBe(1);
  });

  it("awards a streak bonus on a new active day", () => {
    const trainer = defaultTrainer("Ash"); // never active → first event advances the streak
    const species = buildSpecies({ id: "x" });
    const result = applyEvent(
      trainer,
      { kind: "catch", species, source: "manual" },
      { version: 1, species: [species] },
      now,
    );
    expect(result.xpAwarded).toBe(35); // 30 + 5 streak
    expect(result.trainer.streak.current).toBe(1);
  });

  it("seals: grants apex XP and a badge", () => {
    const trainer = defaultTrainer("Ash");
    trainer.streak.lastActive = now.toISOString();
    const species = buildSpecies({
      id: "z",
      status: "sealed",
      seal: { kind: "test", reference: "t", sealedAt: now.toISOString() },
    });
    const result = applyEvent(
      trainer,
      { kind: "seal", species },
      { version: 1, species: [species] },
      now,
    );
    expect(result.xpAwarded).toBe(120);
    expect(result.newBadges).toHaveLength(1);
    expect(result.newBadges[0].id).toBe("sealed:z");
    expect(result.trainer.stats.sealed).toBe(1);
  });

  it("ranks up when crossing a threshold", () => {
    const trainer = defaultTrainer("Ash");
    trainer.xp = 190;
    trainer.streak.lastActive = now.toISOString();
    const species = buildSpecies({ id: "x" });
    const result = applyEvent(
      trainer,
      { kind: "catch", species, source: "manual" },
      { version: 1, species: [species] },
      now,
    );
    expect(result.trainer.xp).toBe(220);
    expect(result.trainer.rank).toBe("Bug Catcher");
    expect(result.rankedUp).toBe(true);
  });
});
