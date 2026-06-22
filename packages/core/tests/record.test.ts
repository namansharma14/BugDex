import { describe, it, expect } from "vitest";
import { recordEncounters } from "../src/matcher/record.js";
import type { Match } from "../src/matcher/matcher.js";
import type { Dex } from "../src/schema/index.js";
import { buildSpecies, enc } from "./helpers.js";

function match(speciesId: string, file = "src/a.ts", line = 1): Match {
  return {
    speciesId,
    name: "X",
    type: "null",
    rarity: "common",
    severity: 2,
    file,
    line,
    confidence: "high",
    fix: { summary: "" },
    status: "caught",
    encounters: 0,
  };
}

describe("recordEncounters", () => {
  it("records an encounter and bumps lastSeen", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const dex: Dex = { version: 1, species: [buildSpecies({ id: "x", encounters: [] })] };
    const result = recordEncounters(dex, [match("x")], { nemesisThreshold: 3, now });
    expect(result.recorded).toHaveLength(1);
    expect(result.dex.species[0].encounters).toHaveLength(1);
    expect(result.dex.species[0].lastSeen).toBe(now.toISOString());
  });

  it("debounces a repeat of the same file within the window", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const dex: Dex = {
      version: 1,
      species: [buildSpecies({ id: "x", encounters: [enc(now.toISOString(), "src/a.ts")] })],
    };
    const later = new Date("2026-06-01T00:01:00.000Z"); // 1 min later
    const result = recordEncounters(dex, [match("x")], { nemesisThreshold: 3, now: later });
    expect(result.recorded).toHaveLength(0);
    expect(result.debounced).toHaveLength(1);
  });

  it("records again once the window passes", () => {
    const start = "2026-06-01T00:00:00.000Z";
    const dex: Dex = {
      version: 1,
      species: [buildSpecies({ id: "x", encounters: [enc(start, "src/a.ts")] })],
    };
    const later = new Date("2026-06-01T00:10:00.000Z"); // 10 min later
    const result = recordEncounters(dex, [match("x")], { nemesisThreshold: 3, now: later });
    expect(result.recorded).toHaveLength(1);
    expect(result.dex.species[0].encounters).toHaveLength(2);
  });

  it("promotes to nemesis at the threshold", () => {
    const dex: Dex = {
      version: 1,
      species: [
        buildSpecies({
          id: "x",
          status: "recurring",
          encounters: [
            enc("2026-06-01T00:00:00.000Z", "a.ts"),
            enc("2026-06-02T00:00:00.000Z", "b.ts"),
          ],
        }),
      ],
    };
    const now = new Date("2026-06-10T00:00:00.000Z");
    const result = recordEncounters(dex, [match("x", "c.ts")], { nemesisThreshold: 3, now });
    expect(result.dex.species[0].encounters).toHaveLength(3);
    expect(result.dex.species[0].status).toBe("nemesis");
  });

  it("keeps a sealed species sealed", () => {
    const dex: Dex = {
      version: 1,
      species: [
        buildSpecies({
          id: "x",
          status: "sealed",
          seal: { kind: "test", reference: "t", sealedAt: "2026-01-01T00:00:00.000Z" },
          encounters: [],
        }),
      ],
    };
    const now = new Date("2026-06-10T00:00:00.000Z");
    const result = recordEncounters(dex, [match("x")], { nemesisThreshold: 3, now });
    expect(result.dex.species[0].status).toBe("sealed");
  });

  it("does not mutate the input dex", () => {
    const dex: Dex = { version: 1, species: [buildSpecies({ id: "x", encounters: [] })] };
    recordEncounters(dex, [match("x")], { nemesisThreshold: 3 });
    expect(dex.species[0].encounters).toHaveLength(0);
  });
});
