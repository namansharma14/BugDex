// Sample: catches GHOSTKEY (hardcoded secret).
export const apiKey = "sk_live_51HxAbCdEfGhIjKlMnOpQr";

export function authHeader(): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}
