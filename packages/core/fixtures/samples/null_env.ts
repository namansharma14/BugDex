// Sample: catches VOIDLING (unguarded env var dereference).
export function token(): string {
  return process.env.AUTH_TOKEN.trim();
}
