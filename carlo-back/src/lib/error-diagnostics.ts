import { existsSync } from "node:fs";

const certificatePath = "/etc/secrets/supabase-prod-ca-2021.crt";
const databaseCode = /^(?:P\d{4}|\d{2}[A-Z0-9]{3}|(?:F0|HV|P0|XX)[A-Z0-9]{3})$/;
const prismaNames = new Set([
  "PrismaClientInitializationError", "PrismaClientKnownRequestError",
  "PrismaClientUnknownRequestError", "PrismaClientRustPanicError",
]);

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function safeErrorDiagnostics(error: unknown) {
  const item = record(error);
  const meta = record(item.meta);
  const cause = record(item.cause);
  const candidates = [item.code, item.errorCode, meta.code, meta.sqlstate, cause.code, cause.errorCode];
  const codes = candidates.filter((value): value is string => typeof value === "string" && databaseCode.test(value));
  // Raw query errors can carry the PostgreSQL SQLSTATE under Prisma P2010.
  const code = codes.find(value => value !== "P2010") ?? codes[0] ?? null;
  const isDatabase = codes.length > 0 || (typeof item.name === "string" && prismaNames.has(item.name));
  let category = isDatabase ? "DATABASE" : "INTERNAL";
  if (isDatabase) {
    // Inspect messages only to select fixed labels. Never return or log their contents.
    const message = typeof item.message === "string" ? item.message : "";
    if (code === "P1000" || code?.startsWith("28") || /authentication failed|password authentication|credentials.*not valid/i.test(message)) {
      category = "DATABASE_AUTHENTICATION";
    } else if (code === "P1011" || /certificate|\bTLS\b|\bSSL\b/i.test(message)) {
      category = "DATABASE_TLS";
    } else if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code ?? "") || code?.startsWith("08") || /can't reach|timed out|connection refused/i.test(message)) {
      category = "DATABASE_CONNECTION";
    } else if (code === "P1010" || code === "42501") {
      category = "DATABASE_PERMISSION";
    } else if (["P2021", "P2022", "3F000", "42P01", "42703"].includes(code ?? "")) {
      category = "DATABASE_SCHEMA";
    } else if (item.name === "PrismaClientInitializationError") {
      category = "DATABASE_INITIALIZATION";
    }
  }
  let certificateExists = false;
  try { certificateExists = existsSync(certificatePath); } catch { /* Boolean only, even on filesystem failure. */ }
  return { code, category, certificateExists, databaseUrlDefined: Boolean(process.env.DATABASE_URL) };
}
