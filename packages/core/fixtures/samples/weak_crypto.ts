// Sample: catches HASHWRAITH (weak hash) and RANDOGHAST (insecure randomness).
import crypto from "node:crypto";

export function digest(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex");
}

export function sessionId(): string {
  return Math.random().toString(36).slice(2);
}
