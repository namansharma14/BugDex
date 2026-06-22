import { extname } from "node:path";

/** Map a file extension to a BugDex language id (v1: TS/JS + Python). */
export function languageForFile(file: string): string | undefined {
  switch (extname(file).toLowerCase()) {
    case ".ts":
    case ".tsx":
    case ".mts":
    case ".cts":
      return "typescript";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".py":
    case ".pyi":
      return "python";
    default:
      return undefined;
  }
}

/**
 * Does a signature scoped to `sigLanguages` apply to a file of `fileLanguage`?
 * No scope means language-agnostic. TypeScript also inherits JavaScript rules
 * (it's a superset). An unknown file language only matches agnostic signatures.
 */
export function languageMatches(
  fileLanguage: string | undefined,
  sigLanguages: string[] | undefined,
): boolean {
  if (!sigLanguages || sigLanguages.length === 0) return true;
  if (fileLanguage === undefined) return false;
  if (sigLanguages.includes(fileLanguage)) return true;
  return fileLanguage === "typescript" && sigLanguages.includes("javascript");
}
