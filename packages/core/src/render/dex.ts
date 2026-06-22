import type { BugType, Rarity, Status } from "../taxonomy/index.js";
import type { Flair } from "../schema/index.js";
import { createPainter, defaultColorEnabled, type Painter } from "./paint.js";

export interface DexRow {
  dexNumber: number;
  name: string;
  commonName: string;
  type: BugType;
  rarity: Rarity;
  status: Status;
  encounters: number;
}

export interface DexRenderOptions {
  /** Distinct bug types present, for the high-flair "regional dex" meter. */
  typesCovered?: number;
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

function regionalMeter(typesCovered: number, p: Painter, total = 10): string {
  const filled = Math.min(total, Math.max(0, typesCovered));
  return p.c.cyan("▓".repeat(filled) + "░".repeat(total - filled));
}

/**
 * Render the dex listing at the given flair level. `off` is plain, one line per
 * species; `medium`/`high` add colour, type badges, rarity dots, and (high) a
 * regional-completion meter.
 */
export function renderDex(
  rows: DexRow[],
  flair: Flair,
  painter: Painter = createPainter(flair !== "off" && defaultColorEnabled()),
  opts: DexRenderOptions = {},
): string {
  if (rows.length === 0) return "The dex is empty. Catch a bug with `bugdex catch`.";

  if (flair === "off") {
    return rows
      .map(
        (r) =>
          `#${pad3(r.dexNumber)} ${r.name}  ${r.type}  ${r.rarity}  ${r.status}  x${r.encounters}`,
      )
      .join("\n");
  }

  const p = painter;
  const lines: string[] = [];
  if (flair === "high") lines.push(p.heading(`BugDex — ${rows.length} species`));

  for (const r of rows) {
    const num = p.dim(`#${pad3(r.dexNumber)}`);
    const name = p.heading(r.name.padEnd(14));
    const type = p.type(r.type, r.type.padEnd(11));
    const dots = p.rarityDots(r.rarity);
    const status = r.status === "nemesis" ? p.statusLabel(r.status) : p.dim(r.status.padEnd(9));
    const enc = p.dim(`×${r.encounters}`);
    lines.push(`${num} ${name} ${type} ${dots} ${status} ${enc}`);
    if (flair === "high") lines.push(`     ${p.dim(r.commonName)}`);
  }

  if (flair === "high" && opts.typesCovered !== undefined) {
    lines.push(
      "",
      `${p.heading("Regional dex")} ${regionalMeter(opts.typesCovered, p)} ${opts.typesCovered}/10 types`,
    );
  }
  return lines.join("\n");
}
