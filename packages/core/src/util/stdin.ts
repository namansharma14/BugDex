/** Read all of stdin as a string (empty if stdin is a TTY or has no input). */
export async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Read and JSON-parse a hook's stdin payload; returns {} on any problem. */
export async function readHookInput(): Promise<Record<string, unknown>> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
