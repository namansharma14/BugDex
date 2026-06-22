import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildHookMessage } from "../src/commands/match.js";
import { buildSessionCardContext } from "../src/commands/card.js";
import type { Match } from "../src/matcher/matcher.js";
import type { Dex } from "../src/schema/index.js";
import { defaultTrainer } from "../src/storage/defaults.js";
import { buildSpecies, enc, REPO_ROOT } from "./helpers.js";

const PLUGIN_DIR = join(REPO_ROOT, "plugins", "bugdex");

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("plugin manifest", () => {
  it("declares the bugdex plugin", async () => {
    const manifest = await readJson(join(PLUGIN_DIR, ".claude-plugin", "plugin.json"));
    expect(manifest.name).toBe("bugdex");
    expect(manifest.version).toBeTruthy();
    expect((manifest.author as { name?: string }).name).toBeTruthy();
  });
});

describe("marketplace manifest", () => {
  it("points at the plugin source", async () => {
    const market = await readJson(join(REPO_ROOT, ".claude-plugin", "marketplace.json"));
    expect((market.owner as { name?: string }).name).toBeTruthy();
    const plugins = market.plugins as { name: string; source: string }[];
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe("bugdex");
    expect(plugins[0].source).toBe("./plugins/bugdex");
  });
});

describe("hooks", () => {
  it("wires non-blocking PostToolUse + SessionStart to the bundle", async () => {
    const cfg = await readJson(join(PLUGIN_DIR, "hooks", "hooks.json"));
    const hooks = cfg.hooks as Record<
      string,
      { matcher?: string; hooks: { command: string; timeout?: number }[] }[]
    >;

    const post = hooks.PostToolUse[0];
    expect(post.matcher).toBe("Edit|Write|MultiEdit");
    expect(post.hooks[0].command).toContain("bin/bugdex.cjs");
    expect(post.hooks[0].command).toContain("match --hook-input");
    expect(post.hooks[0].command).toContain("${CLAUDE_PLUGIN_ROOT}");
    expect(typeof post.hooks[0].timeout).toBe("number");

    const session = hooks.SessionStart[0];
    expect(session.hooks[0].command).toContain("card --hook");
  });
});

describe("slash commands & subagent", () => {
  it("ships the six commands and the read-only bug-hunter", async () => {
    for (const name of ["scan", "dex", "catch", "seal", "card", "dashboard"]) {
      const body = await readFile(join(PLUGIN_DIR, "commands", `${name}.md`), "utf8");
      expect(body).toContain("description:");
    }
    const agent = await readFile(join(PLUGIN_DIR, "agents", "bug-hunter.md"), "utf8");
    expect(agent).toContain("name: bug-hunter");
    expect(agent).toContain("tools: Read, Grep, Glob");
    expect(agent).not.toMatch(/tools:.*\b(Write|Edit|Bash)\b/);
  });
});

describe("hook message builders", () => {
  it("formats a PostToolUse message with the fix and a seal hint for a Nemesis", () => {
    const matches: Match[] = [
      {
        speciesId: "voidling",
        name: "VOIDLING",
        type: "null",
        rarity: "common",
        severity: 2,
        file: "src/a.ts",
        line: 7,
        confidence: "high",
        fix: { summary: "guard before deref" },
        status: "nemesis",
        encounters: 6,
      },
    ];
    const msg = buildHookMessage("src/a.ts", matches);
    expect(msg).toContain("VOIDLING");
    expect(msg).toContain("null-type");
    expect(msg).toContain("caught ×6 here");
    expect(msg).toContain("guard before deref");
    expect(msg).toContain("/bugdex:seal voidling");
  });

  it("builds a session card and lists active Nemeses", () => {
    const trainer = defaultTrainer("Ash");
    trainer.xp = 150;
    const dex: Dex = {
      version: 1,
      species: [
        buildSpecies({
          id: "a",
          type: "null",
          status: "nemesis",
          encounters: [enc("2026-01-01T00:00:00.000Z")],
        }),
        buildSpecies({ id: "b", type: "crypto" }),
      ],
    };
    const card = buildSessionCardContext(trainer, dex);
    expect(card).toContain("Ash");
    expect(card).toContain("2 caught");
    expect(card).toContain("Active Nemeses (1)");
    expect(card).toContain("/bugdex:seal a");
  });
});
