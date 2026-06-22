import { sealSpecies } from "../commands/seal.js";
import { buildDashboardState } from "./state.js";

export interface ApiResponse {
  status: number;
  body: unknown;
}

const SEAL_KINDS = ["test", "lint-rule", "type", "assertion"] as const;
type SealKind = (typeof SEAL_KINDS)[number];
function isSealKind(value: unknown): value is SealKind {
  return typeof value === "string" && (SEAL_KINDS as readonly string[]).includes(value);
}

/**
 * The dashboard's tiny JSON API over `.bugdex/`: mostly reads (`GET /api/state`)
 * with a single write (`POST /api/seal`). Returns plain `{ status, body }` so it
 * can be tested without a socket.
 */
export async function handleApi(
  root: string,
  method: string,
  pathname: string,
  body: unknown,
): Promise<ApiResponse> {
  if (method === "GET" && pathname === "/api/state") {
    return { status: 200, body: await buildDashboardState(root) };
  }

  if (method === "POST" && pathname === "/api/seal") {
    const input = (body ?? {}) as { id?: unknown; kind?: unknown; reference?: unknown };
    if (
      typeof input.id !== "string" ||
      typeof input.reference !== "string" ||
      !isSealKind(input.kind)
    ) {
      return {
        status: 400,
        body: { error: "POST /api/seal requires { id, kind, reference } with a valid kind" },
      };
    }
    try {
      await sealSpecies({ root, id: input.id, kind: input.kind, reference: input.reference });
      return { status: 200, body: await buildDashboardState(root) };
    } catch (err) {
      return { status: 400, body: { error: err instanceof Error ? err.message : String(err) } };
    }
  }

  return { status: 404, body: { error: "not found" } };
}
