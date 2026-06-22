import { resolvePaths } from "../storage/paths.js";
import { loadDex } from "../storage/dex.js";
import { loadConfig } from "../storage/config.js";
import { isBugType } from "../taxonomy/index.js";
import { renderDex, resolveFlair, type DexRow } from "../render/index.js";

export interface DexCliOptions {
  type?: string;
  status?: string;
  flair?: string;
  dir?: string;
}

/** `bugdex dex` — list the catalogued species (optionally filtered). */
export async function runDex(opts: DexCliOptions): Promise<void> {
  const root = opts.dir ?? process.cwd();
  const paths = resolvePaths(root);
  const config = await loadConfig(paths.config);
  const { dex } = await loadDex(paths.dex);

  if (opts.type && !isBugType(opts.type)) {
    throw new Error(`--type must be one of the ten bug types (got "${opts.type}").`);
  }

  let species = [...dex.species].sort((a, b) => a.dexNumber - b.dexNumber);
  if (opts.type) species = species.filter((s) => s.type === opts.type);
  if (opts.status) species = species.filter((s) => s.status === opts.status);

  const rows: DexRow[] = species.map((s) => ({
    dexNumber: s.dexNumber,
    name: s.name,
    commonName: s.commonName,
    type: s.type,
    rarity: s.rarity,
    status: s.status,
    encounters: s.encounters.length,
  }));

  const typesCovered = new Set(dex.species.map((s) => s.type)).size;
  const flair = resolveFlair(config.flair, opts.flair);
  process.stdout.write(`${renderDex(rows, flair, undefined, { typesCovered })}\n`);
}
