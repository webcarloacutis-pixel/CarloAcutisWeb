import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "./prisma";
import { HttpError } from "./errors";
import { CATALOG_PAGE_SIZE } from "./catalog-limits";

type Kind = "saint" | "miracle";
type Filter = { saintId?: string; approved?: boolean };
type Cursor = { v: 1; after: string; revision: string; scope: string };
type Metadata = { total: number; revision: string };
const saintListing = {
  id: true, slug: true, name: true, title: true, country: true, feastDay: true, imageUrl: true,
  biography: true, patronOf: true, canonizationYear: true, deathYear: true, birthCountryCode: true,
  birthContinent: true, birthPlace: true, birthLat: true, birthLng: true, birthPrecision: true,
  birthSources: true, createdAt: true, updatedAt: true,
} satisfies Prisma.SaintSelect;

function parseCursor(value: unknown, scope: string): Cursor | undefined {
  if (value === undefined) return;
  if (typeof value !== "string" || value.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new HttpError(400, "INVALID_CURSOR");
  try {
    const cursor: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!cursor || typeof cursor !== "object") throw new Error();
    const c = cursor as Partial<Cursor>;
    if (c.v !== 1 || c.scope !== scope || typeof c.after !== "string" || !c.after.length || c.after.length > 200 ||
        typeof c.revision !== "string" || !/^[a-f0-9]{32}$/.test(c.revision)) throw new Error();
    return c as Cursor;
  } catch { throw new HttpError(400, "INVALID_CURSOR"); }
}

/** Stable keyset pages, with a revision that detects inserts/deletes/edits between requests. */
export async function readCatalogPage(req: Request, kind: Kind, filter: Filter = {}) {
  const rawLimit = req.query.limit ?? String(CATALOG_PAGE_SIZE);
  if (typeof rawLimit !== "string" || !/^\d+$/.test(rawLimit)) throw new HttpError(400, "INVALID_LIMIT");
  const limit = Number(rawLimit);
  if (limit < 1 || limit > CATALOG_PAGE_SIZE) throw new HttpError(400, "INVALID_LIMIT");
  const view = req.query.view ?? "full";
  if (typeof view !== "string" || !["full", "listing", "names"].includes(view) || (kind === "miracle" && view !== "full")) throw new HttpError(400, "INVALID_VIEW");
  const scope = JSON.stringify([kind, filter.saintId ?? null, filter.approved ?? null, view]);
  const cursor = parseCursor(req.query.cursor, scope);

  return prisma.$transaction(async tx => {
    // Static table names only; all filter values are bound SQL parameters.
    const table = kind === "saint" ? Prisma.sql`"Saint"` : Prisma.sql`"Miracle"`;
    const clauses: Prisma.Sql[] = [];
    if (filter.saintId !== undefined) clauses.push(Prisma.sql`"saintId" = ${filter.saintId}`);
    if (filter.approved !== undefined) clauses.push(Prisma.sql`"approved" = ${filter.approved}`);
    const whereSql = clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}` : Prisma.empty;
    const [metadata] = await tx.$queryRaw<Metadata[]>(Prisma.sql`
      SELECT count(*)::integer AS total,
        md5(coalesce(string_agg("id" || ':' || "updatedAt"::text, ',' ORDER BY "id"), '')) AS revision
      FROM ${table} ${whereSql}`);
    if (cursor && cursor.revision !== metadata.revision) throw new HttpError(409, "CATALOG_CHANGED");
    const query = { take: limit + 1, orderBy: { id: "asc" as const } };
    const after = cursor ? { id: { gt: cursor.after } } : {};
    const rows = kind === "saint"
      ? await tx.saint.findMany({ ...query, where: after, ...(view === "names" ? { select: { id: true, name: true, slug: true } } : view === "listing" ? { select: saintListing } : {}) })
      : await tx.miracle.findMany({ ...query, where: { ...filter, ...after } });
    const items = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const nextCursor = hasMore ? Buffer.from(JSON.stringify({ v: 1, after: items[items.length - 1].id, revision: metadata.revision, scope } satisfies Cursor)).toString("base64url") : null;
    return { items, total: metadata.total, nextCursor, hasMore, revision: metadata.revision };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export function sendCatalogPage(res: Response, page: Awaited<ReturnType<typeof readCatalogPage>>, privatePage = false) {
  res.set("X-Total-Count", String(page.total));
  res.set("X-Next-Cursor", page.nextCursor ?? "");
  res.set("Cache-Control", privatePage ? "private, no-store" : "public, max-age=0, must-revalidate");
  return res.json(page);
}
