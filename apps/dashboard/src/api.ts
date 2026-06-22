import type { DashboardState, SealKind } from "./types.js";

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `request failed (${String(res.status)})`);
  }
  return res.json() as Promise<T>;
}

/** Load the full dashboard state. */
export async function fetchState(): Promise<DashboardState> {
  return asJson<DashboardState>(await fetch("/api/state"));
}

/** Seal a species and return the refreshed state. */
export async function sealSpecies(
  id: string,
  kind: SealKind,
  reference: string,
): Promise<DashboardState> {
  return asJson<DashboardState>(
    await fetch("/api/seal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, kind, reference }),
    }),
  );
}
