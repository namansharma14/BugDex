import { resolvePaths } from "../storage/paths.js";
import { loadDex } from "../storage/dex.js";
import { isBugType } from "../taxonomy/index.js";

export interface DexCliOptions {
  type?: string;
  status?: string;
  dir?: string;
}

/** `bugdex dex` — list the catalogued species (optionally filtered). */
export async function runDex(opts: DexCliOptions): Promise<void> {
  const root = opts.dir ?? process.cwd();
  const { dex } = await loadDex(resolvePaths(root).dex);
  const out = process.stdout;

  if (opts.type && !isBugType(opts.type)) {
    throw new Error(`--type must be one of the ten bug types (got "${opts.type}").`);
  }

  let species = [...dex.species].sort((a, b) => a.dexNumber - b.dexNumber);
  if (opts.type) species = species.filter((s) => s.type === opts.type);
  if (opts.status) species = species.filter((s) => s.status === opts.status);

  if (species.length === 0) {
    out.write("The dex is empty. Catch a bug with `bugdex catch`.\n");
    return;
  }

  out.write(`BugDex — ${species.length} species\n`);
  for (const s of species) {
    const num = `#${String(s.dexNumber).padStart(3, "0")}`;
    const head = `${num} ${s.name.padEnd(14)} ${s.type.padEnd(11)} ${s.rarity.padEnd(9)} ${s.status.padEnd(9)} ×${s.encounters.length}`;
    out.write(`${head}\n`);
    out.write(`     ${s.commonName}\n`);
  }
}
