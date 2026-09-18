import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "./prisma";
import { HttpError } from "./errors";
import { CATALOG_PAGE_SIZE } from "./catalog-limits";
import { normalizeCatalogText } from "./saint-catalog";

type Visibility = { saintId?: string; approved?: boolean };
type Cursor = { v: 1; after: string; revision: string; scope: string };
export interface MiracleCatalogFilters { query: string; saintId: string; type: string; approved: boolean | null }

function value(query: Record<string, unknown>, key: string): string {
  const raw = query[key];
  if (raw === undefined) return "";
  if (typeof raw !== "string" || raw.length > 200) throw new HttpError(400, "INVALID_FILTER");
  return raw.trim();
}
export function readMiracleCatalogFilters(query: Record<string, unknown>): MiracleCatalogFilters {
  const approved = value(query, "approved"), verified = value(query, "verified");
  if (approved && verified && approved !== verified) throw new HttpError(400, "INVALID_FILTER");
  const flag = approved || verified;
  if (flag && !["true", "false"].includes(flag)) throw new HttpError(400, "INVALID_FILTER");
  return { query: normalizeCatalogText(value(query, "q")), saintId: value(query, "saintId"), type: value(query, "type"),
    approved: flag ? flag === "true" : null };
}
export function compareMiracleCards(a: { approved: boolean; createdAt: Date; id: string }, b: { approved: boolean; createdAt: Date; id: string }): number {
  return Number(b.approved) - Number(a.approved) || b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
function decodeCursor(value: unknown, scope: string): Cursor | undefined {
  if (value === undefined) return;
  if (typeof value !== "string" || value.length > 1024 || !/^[\w-]+$/.test(value)) throw new HttpError(400, "INVALID_CURSOR");
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!decoded || typeof decoded !== "object") throw new Error();
    const cursor = decoded as Partial<Cursor>;
    if (cursor.v !== 1 || cursor.scope !== scope || typeof cursor.after !== "string" || !cursor.after.length || cursor.after.length > 200 ||
        typeof cursor.revision !== "string" || !/^[a-f0-9]{32}$/.test(cursor.revision)) throw new Error();
    return cursor as Cursor;
  } catch { throw new HttpError(400, "INVALID_CURSOR"); }
}
function normalized(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`regexp_replace(trim(lower(regexp_replace(normalize(coalesce(${column}, ''), NFD), ${"[\u0300-\u036f]"}, '', 'g'))), ${"\\s+"}, ' ', 'g')`;
}

/** Public/admin and Saint relation cards share one bounded implementation; no AI miracle ranking. */
export async function readMiracleCards(req: Request, visibility: Visibility = {}) {
  const raw = req.query.limit ?? "12";
  if (typeof raw !== "string" || !/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > CATALOG_PAGE_SIZE) throw new HttpError(400, "INVALID_LIMIT");
  const limit = Number(raw), filters = readMiracleCatalogFilters(req.query);
  const scope = createHash("sha256").update(JSON.stringify(["miracle-cards-v1", visibility.saintId ?? null, visibility.approved ?? null, filters])).digest("hex");
  const cursor = decodeCursor(req.query.cursor, scope);
  return prisma.$transaction(async tx => {
    const metadata = await tx.miracle.findMany({ where: visibility, select: { id: true, saintId: true, type: true, approved: true,
      createdAt: true, updatedAt: true, saint: { select: { id: true, name: true, slug: true, updatedAt: true } } } });
    const revision = createHash("md5").update(JSON.stringify([scope, [...metadata].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)])).digest("hex");
    if (cursor && cursor.revision !== revision) throw new HttpError(409, "CATALOG_CHANGED");
    let queryIds: Set<string> | undefined;
    if (filters.query) {
      const terms = [Prisma.sql`m."title"`, Prisma.sql`m."details"`, Prisma.sql`s."name"`]
        .map(column => Prisma.sql`position(${filters.query} in ${normalized(column)}) > 0`);
      const clauses = [Prisma.sql`(${Prisma.join(terms, " OR ")})`];
      if (visibility.approved !== undefined) clauses.push(Prisma.sql`m."approved" = ${visibility.approved}`);
      if (visibility.saintId !== undefined) clauses.push(Prisma.sql`m."saintId" = ${visibility.saintId}`);
      const matching = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT m."id" FROM "Miracle" m JOIN "Saint" s ON s."id" = m."saintId" WHERE ${Prisma.join(clauses, " AND ")}`);
      queryIds = new Set(matching.map(row => row.id));
    }
    const matched = metadata.filter(row => (!queryIds || queryIds.has(row.id)) && (!filters.saintId || row.saintId === filters.saintId) &&
      (!filters.type || row.type?.trim() === filters.type) && (filters.approved === null || row.approved === filters.approved)).sort(compareMiracleCards);
    const position = cursor ? matched.findIndex(row => row.id === cursor.after) : -1;
    if (cursor && position < 0) throw new HttpError(400, "INVALID_CURSOR");
    const selected = matched.slice(position + 1, position + 1 + limit);
    const detail = selected.length ? await tx.miracle.findMany({ where: { id: { in: selected.map(row => row.id) } }, include: { saint: { select: { id: true, name: true, slug: true } } } }) : [];
    const byId = new Map(detail.map(row => [row.id, row]));
    const items = selected.map(row => { const item = byId.get(row.id)!; return { ...item, saintName: item.saint.name, saintSlug: item.saint.slug }; });
    const offset = position + 1, hasMore = offset + items.length < matched.length;
    const encode = (after: string) => Buffer.from(JSON.stringify({ v: 1, after, revision, scope } satisfies Cursor)).toString("base64url");
    const nextCursor = hasMore ? encode(items[items.length - 1].id) : null;
    const previousStart = Math.max(0, offset - limit), previousCursor = previousStart ? encode(matched[previousStart - 1].id) : null;
    return { items, total: matched.length, nextCursor, hasMore, offset, previousCursor, hasPrevious: offset > 0, revision,
      metadata: { approvedTotal: matched.filter(row => row.approved).length,
        facets: { types: [...new Set(metadata.map(row => row.type?.trim()).filter((type): type is string => !!type))].sort() } } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export function sendMiracleCards(res: Response, page: Awaited<ReturnType<typeof readMiracleCards>>, privatePage = false) {
  res.set("X-Total-Count", String(page.total)); res.set("X-Next-Cursor", page.nextCursor ?? "");
  res.set("Cache-Control", privatePage ? "private, no-store" : "public, max-age=0, must-revalidate");
  return res.json(page);
}
