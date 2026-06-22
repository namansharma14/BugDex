import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleApi } from "../src/dashboard/api.js";
import { buildDashboardState } from "../src/dashboard/state.js";
import { startDashboard, type DashboardServer } from "../src/dashboard/server.js";
import { catchSpecies } from "../src/commands/catch.js";
import { init } from "../src/storage/init.js";
import { loadDex } from "../src/storage/dex.js";
import { resolvePaths } from "../src/storage/paths.js";
import { makeTempRepo, cleanup } from "./helpers.js";

let repo: string;
let speciesId: string;

beforeEach(async () => {
  repo = await makeTempRepo();
  await init({ root: repo });
  const caught = await catchSpecies({
    root: repo,
    type: "null",
    commonName: "Unguarded null deref",
    severity: 2,
    fixSummary: "guard it",
  });
  speciesId = caught.species.id;
});
afterEach(async () => {
  await cleanup(repo);
});

describe("buildDashboardState", () => {
  it("assembles trainer, regional, species, and taxonomy", async () => {
    const state = await buildDashboardState(repo);
    expect(state.species).toHaveLength(1);
    expect(state.trainer.caught).toBe(1);
    expect(state.regional.total).toBe(10);
    expect(state.regional.covered).toBe(1);
    expect(state.taxonomy.null.color).toMatch(/^#/);
    expect(state.bugTypes).toHaveLength(10);
  });
});

describe("handleApi", () => {
  it("GET /api/state returns the dashboard payload", async () => {
    const res = await handleApi(repo, "GET", "/api/state", undefined);
    expect(res.status).toBe(200);
    expect((res.body as { species: unknown[] }).species).toHaveLength(1);
  });

  it("POST /api/seal seals a species and returns fresh state", async () => {
    const res = await handleApi(repo, "POST", "/api/seal", {
      id: speciesId,
      kind: "test",
      reference: "tests/guard.test.ts",
    });
    expect(res.status).toBe(200);
    const { dex } = await loadDex(resolvePaths(repo).dex);
    expect(dex.species[0].status).toBe("sealed");
  });

  it("rejects an invalid seal and unknown routes", async () => {
    expect((await handleApi(repo, "POST", "/api/seal", { id: speciesId })).status).toBe(400);
    expect((await handleApi(repo, "GET", "/api/nope", undefined)).status).toBe(404);
  });
});

describe("startDashboard", () => {
  let server: DashboardServer;
  afterEach(async () => {
    if (server) await server.close();
  });

  it("serves the SPA and the API over HTTP", async () => {
    server = await startDashboard({ root: repo, port: 0 });

    const html = await fetch(server.url);
    expect(html.status).toBe(200);
    expect(html.headers.get("content-type")).toContain("text/html");
    expect(await html.text()).toContain("BugDex");

    const state = await fetch(`${server.url}/api/state`);
    expect(state.status).toBe(200);
    const json = (await state.json()) as { species: unknown[] };
    expect(json.species).toHaveLength(1);

    const sealed = await fetch(`${server.url}/api/seal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: speciesId, kind: "lint-rule", reference: "eslint:no-x" }),
    });
    expect(sealed.status).toBe(200);
    const { dex } = await loadDex(resolvePaths(repo).dex);
    expect(dex.species[0].status).toBe("sealed");
  });
});
