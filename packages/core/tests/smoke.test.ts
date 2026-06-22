import { describe, it, expect } from "vitest";
import { VERSION } from "../src/index.js";

describe("bugdex core smoke test", () => {
  it("exposes a semver-ish version string", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
