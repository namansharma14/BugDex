import type { Signature } from "../schema/index.js";
import { isLikelySafeRegex } from "../matcher/regex-safety.js";
import { languageForFile } from "../matcher/language.js";
import type { Candidate } from "./candidate.js";

/**
 * Turn the most salient line of a snippet into a literal-ish, ReDoS-safe regex:
 * escape every metacharacter, then let runs of whitespace flex. The result
 * re-catches the same code without any quantifier nesting.
 */
export function snippetToRegex(snippet: string): string {
  const line =
    snippet
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? snippet.trim();
  const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(/\s+/g, "\\s+").slice(0, 200);
}

/**
 * Resolve the signature to persist for a confirmed candidate: prefer the one
 * the bug-hunter drafted; otherwise auto-generate a regex from the snippet.
 * Returns undefined if neither is available or the result isn't safe.
 */
export function generateSignature(candidate: Candidate): Signature | undefined {
  if (candidate.signature) return candidate.signature;
  if (!candidate.snippet) return undefined;

  const pattern = snippetToRegex(candidate.snippet);
  if (pattern.length === 0 || !isLikelySafeRegex(pattern)) return undefined;

  const language = candidate.file ? languageForFile(candidate.file) : undefined;
  return { kind: "regex", pattern, ...(language ? { languages: [language] } : {}) };
}
