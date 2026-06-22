// Sample: catches PARSELMOUTH (SQL injection via concatenation).
export async function findUser(db: { query: (sql: string) => Promise<unknown> }, userId: string) {
  const rows = await db.query("SELECT * FROM users WHERE id = " + userId);
  return rows;
}
