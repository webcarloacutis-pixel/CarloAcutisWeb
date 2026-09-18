import type { Prisma } from "@prisma/client";
import { CATALOG_CAPACITY } from "./catalog-limits";
import { HttpError } from "./errors";

/** Every catalogue creator takes the same transaction lock before count + insert. */
export async function reserveCatalogCapacity(tx: Prisma.TransactionClient, kind: "saint" | "miracle", additions = 1) {
  if (!Number.isSafeInteger(additions) || additions < 0) throw new Error("INVALID_CAPACITY_RESERVATION");
  if (!additions) return;
  const key = kind === "saint" ? 1 : 2;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(30002026, ${key}::integer)`;
  const count = kind === "saint" ? await tx.saint.count() : await tx.miracle.count();
  if (count + additions > CATALOG_CAPACITY) throw new HttpError(409, kind === "saint" ? "SAINT_LIMIT_REACHED" : "MIRACLE_LIMIT_REACHED");
}
