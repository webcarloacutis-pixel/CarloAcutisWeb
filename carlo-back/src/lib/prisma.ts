import { PrismaClient } from "@prisma/client";
import { databaseUrlWithPool } from "./database-config";
// Exactly one Prisma client per application process, with an enforced pool budget.
export const runtimeDatabaseUrl = process.env.DATABASE_URL ? databaseUrlWithPool(process.env.DATABASE_URL) : undefined;
export const prisma = new PrismaClient({
  log: [],
  ...(runtimeDatabaseUrl ? { datasources: { db: { url: runtimeDatabaseUrl } } } : {}),
  transactionOptions: { maxWait: 5000, timeout: 10000 },
});
