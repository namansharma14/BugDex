import { describe, it, expect, afterEach } from "vitest";
import {
  createPainter,
  defaultColorEnabled,
  resolveFlair,
  renderCard,
  renderDex,
  type CardData,
  type DexRow,
} from "../src/render/index.js";

const ESC = String.fromCharCode(27); // ANSI escape introducer
const hasAnsi = (s: string): boolean => s.includes(ESC);
const stripAnsi = (s: string): string => s.replace(new RegExp(`${ESC}\\[[0-9;]*m`, "g"), "");

const card: CardData = {
  name: "Ash",
  rankTitle: "Ace Trainer",
  rankFlavor: "Reads stack traces for fun",
  xp: 620,
  caught: 12,
  sealed: 3,
  streak: 5,
  badges: ["Sealed VOIDLING"],
  next: { title: "Gym Leader", floor: 600, ceil: 1200, sealsNeeded: 0, regionalNeeded: false },
  nemeses: [{ id: "voidling", name: "VOIDLING", type: "null", encounters: 6 }],
};

const rows: DexRow[] = [
  {
    dexNumber: 1,
    name: "PARSELMOUTH",
    commonName: "SQL injection",
    type: "injection",
    rarity: "legendary",
    status: "caught",
    encounters: 0,
  },
  {
    dexNumber: 2,
    name: "VOIDLING",
    commonName: "Null deref",
    type: "null",
    rarity: "common",
    status: "nemesis",
    encounters: 6,
  },
];

describe("painter", () => {
  it("emits plain text when disabled and ANSI when enabled", () => {
    expect(createPainter(false).type("null", "x")).toBe("x");
    expect(hasAnsi(createPainter(false).type("null", "x"))).toBe(false);
    expect(hasAnsi(createPainter(true).type("null", "x"))).toBe(true);
  });

  it("renders four rarity dots and a NEMESIS label", () => {
    expect(stripAnsi(createPainter(false).rarityDots("rare"))).toBe("●●●○");
    expect(stripAnsi(createPainter(false).statusLabel("nemesis"))).toContain("NEMESIS");
  });
});

describe("defaultColorEnabled", () => {
  const original = process.env.NO_COLOR;
  afterEach(() => {
    if (original === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = original;
  });

  it("honours NO_COLOR", () => {
    process.env.NO_COLOR = "1";
    expect(defaultColorEnabled()).toBe(false);
  });
});

describe("resolveFlair", () => {
  it("prefers a valid override, else the config value", () => {
    expect(resolveFlair("high", "off")).toBe("off");
    expect(resolveFlair("high", "bogus")).toBe("high");
    expect(resolveFlair("medium", undefined)).toBe("medium");
  });
});

describe("renderCard", () => {
  it("off is a single plain line", () => {
    const out = renderCard(card, "off");
    expect(out.includes("\n")).toBe(false);
    expect(hasAnsi(out)).toBe(false);
    expect(out).toContain("Ash");
    expect(out).toContain("Ace Trainer");
    expect(out).toContain("620 XP");
  });

  it("high draws a framed card with an XP bar and Nemeses", () => {
    const out = stripAnsi(renderCard(card, "high", createPainter(false)));
    expect(out).toContain("╭─ BugDex Trainer");
    expect(out).toContain("Ash");
    expect(out).toMatch(/[▓░]/); // xp bar
    expect(out).toContain("to Gym Leader");
    expect(out).toContain("Active Nemeses (1)");
    expect(out).toContain("/bugdex:seal voidling");
  });

  it("colourises when the painter is enabled", () => {
    expect(hasAnsi(renderCard(card, "high", createPainter(true)))).toBe(true);
  });

  it("shows max rank when there is no next", () => {
    const maxed: CardData = { ...card, next: undefined };
    expect(stripAnsi(renderCard(maxed, "medium", createPainter(false)))).toContain("max rank");
  });
});

describe("renderDex", () => {
  it("off is plain, one line per species", () => {
    const out = renderDex(rows, "off");
    expect(hasAnsi(out)).toBe(false);
    expect(out.split("\n")).toHaveLength(2);
    expect(out).toContain("PARSELMOUTH");
    expect(out).toContain("VOIDLING");
  });

  it("high adds a header and a regional meter", () => {
    const out = stripAnsi(renderDex(rows, "high", createPainter(false), { typesCovered: 5 }));
    expect(out).toContain("BugDex — 2 species");
    expect(out).toContain("Regional dex");
    expect(out).toContain("5/10 types");
  });

  it("colourises when enabled and reports an empty dex", () => {
    expect(hasAnsi(renderDex(rows, "high", createPainter(true)))).toBe(true);
    expect(renderDex([], "high")).toContain("empty");
  });
});
