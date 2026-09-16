/** Shared safety gate for tests that may write the local disposable PostgreSQL database. */
export function integrationDatabaseEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ACUTIS_INTEGRATION_TEST !== "1") return false;
  try {
    const target = new URL(env.DATABASE_URL ?? "");
    if (["postgres:", "postgresql:"].includes(target.protocol) &&
        ["127.0.0.1", "localhost"].includes(target.hostname) && target.port === "55439" &&
        target.pathname === "/acutis_repair_test") return true;
  } catch { /* Report a safe target error, never a connection string. */ }
  throw new Error("EXACT_DISPOSABLE_DATABASE_REQUIRED");
}
