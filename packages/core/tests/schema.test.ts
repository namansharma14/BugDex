import { describe, it, expect } from "vitest";
import {
  speciesSchema,
  signatureSchema,
  severitySchema,
  dexSchema,
  configSchema,
  trainerSchema,
} from "../src/schema/index.js";
import { defaultConfig, defaultTrainer } from "../src/storage/defaults.js";
import { buildSpecies } from "./helpers.js";

describe("species schema", () => {
  it("accepts a well-formed species", () => {
    expect(speciesSchema.safeParse(buildSpecies()).success).toBe(true);
  });

  it("rejects an unknown bug type", () => {
    const result = speciesSchema.safeParse({ ...buildSpecies(), type: "bananas" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty id", () => {
    expect(speciesSchema.safeParse({ ...buildSpecies(), id: "" }).success).toBe(false);
  });

  it("requires a fix summary", () => {
    expect(speciesSchema.safeParse({ ...buildSpecies(), fix: {} }).success).toBe(false);
  });
});

describe("severity schema", () => {
  it("accepts 1..5 and rejects out-of-range values", () => {
    for (const ok of [1, 2, 3, 4, 5]) expect(severitySchema.safeParse(ok).success).toBe(true);
    for (const bad of [0, 6, 2.5, "3"]) expect(severitySchema.safeParse(bad).success).toBe(false);
  });
});

describe("signature schema", () => {
  it("validates every signature kind", () => {
    expect(signatureSchema.safeParse({ kind: "regex", pattern: "x" }).success).toBe(true);
    expect(signatureSchema.safeParse({ kind: "structural", rule: "named" }).success).toBe(true);
    expect(signatureSchema.safeParse({ kind: "ast", language: "ts", query: "(x)" }).success).toBe(
      true,
    );
    expect(
      signatureSchema.safeParse({ kind: "fingerprint", model: "m", vector: [0.1], threshold: 0.8 })
        .success,
    ).toBe(true);
  });

  it("rejects an unknown kind and a regex without a pattern", () => {
    expect(signatureSchema.safeParse({ kind: "telepathy" }).success).toBe(false);
    expect(signatureSchema.safeParse({ kind: "regex" }).success).toBe(false);
  });
});

describe("dex schema", () => {
  it("accepts empty and populated dexes", () => {
    expect(dexSchema.safeParse({ version: 1, species: [] }).success).toBe(true);
    expect(dexSchema.safeParse({ version: 1, species: [buildSpecies()] }).success).toBe(true);
  });

  it("rejects an unsupported version", () => {
    expect(dexSchema.safeParse({ version: 2, species: [] }).success).toBe(false);
  });
});

describe("config & trainer defaults", () => {
  it("produces a schema-valid default config", () => {
    expect(configSchema.safeParse(defaultConfig()).success).toBe(true);
    expect(configSchema.safeParse(defaultConfig({ team: true })).success).toBe(true);
  });

  it("produces a schema-valid default trainer", () => {
    expect(trainerSchema.safeParse(defaultTrainer("Ash")).success).toBe(true);
  });
});
