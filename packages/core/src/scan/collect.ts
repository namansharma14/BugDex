import { isAbsolute, join } from "node:path";
import type { Signature } from "../schema/index.js";
import { resolvePaths } from "../storage/paths.js";
import { loadDex } from "../storage/dex.js";
import { languageForFile } from "../matcher/language.js";
import { collectFiles, readFileSafe } from "../util/files.js";
import { gitChangedFiles, gitDiff } from "../util/git.js";

export interface CollectedFile {
  file: string;
  language?: string;
  content: string;
}

export interface ScanDexSummary {
  count: number;
  species: {
    id: string;
    name: string;
    type: string;
    commonName: string;
    signatures: Signature[];
  }[];
}

export interface ScanCollection {
  mode: "diff" | "path";
  /** Raw `git diff` (diff mode only), truncated. */
  diff?: string;
  files: CollectedFile[];
  dexSummary: ScanDexSummary;
}

export interface CollectScanOptions {
  root: string;
  paths?: string[];
  diff?: boolean;
  maxFiles?: number;
  maxFileBytes?: number;
  maxDiffBytes?: number;
}

async function readFiles(
  files: string[],
  maxFiles: number,
  maxBytes: number,
): Promise<CollectedFile[]> {
  const out: CollectedFile[] = [];
  for (const file of files.slice(0, maxFiles)) {
    const content = await readFileSafe(file);
    if (content === null) continue;
    out.push({ file, language: languageForFile(file), content: content.slice(0, maxBytes) });
  }
  return out;
}

/**
 * Gather the raw material for a deep scan: the target code (a path's files, or
 * the working-tree diff) plus a summary of existing dex signatures so the
 * bug-hunter can skip already-catalogued classes. Pure IO — no analysis.
 */
export async function collectScan(opts: CollectScanOptions): Promise<ScanCollection> {
  const maxFiles = opts.maxFiles ?? 50;
  const maxFileBytes = opts.maxFileBytes ?? 64 * 1024;
  const maxDiffBytes = opts.maxDiffBytes ?? 200_000;

  const { dex } = await loadDex(resolvePaths(opts.root).dex);
  const dexSummary: ScanDexSummary = {
    count: dex.species.length,
    species: dex.species.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      commonName: s.commonName,
      signatures: s.signatures,
    })),
  };

  const usePath = opts.paths !== undefined && opts.paths.length > 0 && !opts.diff;
  if (usePath) {
    const files = await collectFiles(opts.paths ?? [], { maxFiles });
    return { mode: "path", files: await readFiles(files, maxFiles, maxFileBytes), dexSummary };
  }

  const diff = await gitDiff(opts.root);
  const changed = (await gitChangedFiles(opts.root))
    .map((f) => (isAbsolute(f) ? f : join(opts.root, f)))
    .filter((f) => languageForFile(f) !== undefined);
  return {
    mode: "diff",
    diff: diff.slice(0, maxDiffBytes),
    files: await readFiles(changed, maxFiles, maxFileBytes),
    dexSummary,
  };
}
