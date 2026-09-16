export function databaseUrlWithPool(databaseUrl: string, rawLimit = process.env.DB_CONNECTION_LIMIT ?? "5") {
  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error("DB_CONNECTION_LIMIT must be an integer from 1 to 10");
  const url = new URL(databaseUrl);
  if (!["postgresql:", "postgres:"].includes(url.protocol)) throw new Error("DATABASE_URL must configure PostgreSQL");
  // Override even a provider-generated URI so each process obeys the documented budget.
  url.searchParams.set("connection_limit", String(limit));
  url.searchParams.set("pool_timeout", "10");
  url.searchParams.set("connect_timeout", "10");
  return url.toString();
}
