/**
 * Thrown when a `.bugdex` JSON file can't even be parsed as JSON (as opposed
 * to a schema-invalid entry, which is quarantined rather than thrown).
 */
export class DexParseError extends Error {
  readonly path: string;

  constructor(path: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to parse JSON at ${path}: ${detail}`);
    this.name = "DexParseError";
    this.path = path;
    this.cause = cause;
  }
}
