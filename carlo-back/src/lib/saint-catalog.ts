import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import type { Request } from "express";
import { prisma } from "./prisma";
import { HttpError } from "./errors";
import { CATALOG_PAGE_SIZE } from "./catalog-limits";
import { compareSaintRank, publicSaintEstimate, saintRankingRevision } from "../popularity/ranking";
import type { EstimateRow } from "../popularity/domain";

const regionNames = new Intl.DisplayNames(["es"], { type: "region" });
const knownContinents = ["europe", "asia", "africa", "north-america", "south-america", "oceania", "antarctica"];
export interface SaintCatalogFilters { query: string; continent: string; country: string; century: string }
type MetadataSaint = { id: string; name: string; updatedAt: Date; birthContinent: string | null; birthCountryCode: string | null; deathYear: number | null };
type Cursor = { v: 1; after: string; revision: string; scope: string };

export function normalizeCatalogText(value: string | null): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
}
export function catalogContinent(value: string | null): string {
  const key = normalizeCatalogText(value).replace(/\s+/g, "-");
  const aliases: Record<string, string> = { europa: "europe", "america-del-norte": "north-america", norteamerica: "north-america",
    "america-del-sur": "south-america", sudamerica: "south-america", antartida: "antarctica", desconocido: "unknown", "sin-documentar": "unknown" };
  return aliases[key] ?? key;
}
function readValue(query: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = query[key];
    if (value === undefined) continue;
    if (typeof value !== "string" || value.length > 200) throw new HttpError(400, "INVALID_FILTER");
    return value.trim();
  }
  return "";
}
export function readSaintCatalogFilters(query: Record<string, unknown>): SaintCatalogFilters {
  return { query: normalizeCatalogText(readValue(query, "q", "busqueda", "query")),
    continent: catalogContinent(readValue(query, "continent", "continente")),
    country: normalizeCatalogText(readValue(query, "country", "pais")), century: readValue(query, "century", "siglo") };
}
export function matchesSaintMetadata(saint: Pick<MetadataSaint, "birthContinent" | "birthCountryCode" | "deathYear">, filters: SaintCatalogFilters): boolean {
  if (filters.continent) {
    const actual = catalogContinent(saint.birthContinent);
    const matches = filters.continent === "unknown" ? !knownContinents.includes(actual)
      : filters.continent === "america" ? ["north-america", "south-america"].includes(actual) : actual === filters.continent;
    if (!matches) return false;
  }
  if (filters.country) {
    if (!saint.birthCountryCode) return false;
    const code = saint.birthCountryCode;
    const label = /^[A-Z]{2}$/.test(code) ? regionNames.of(code) ?? code : "País de nacimiento sin documentar";
    if (![normalizeCatalogText(code), normalizeCatalogText(label)].includes(filters.country)) return false;
  }
  if (filters.century) {
    const year = saint.deathYear;
    const century = typeof year === "number" && Number.isInteger(year) && year !== 0 ? Math.sign(year) * Math.ceil(Math.abs(year) / 100) : null;
    if (filters.century === "bce") return century !== null && century < 0;
    if (filters.century === "unknown") return century === null;
    const range = /^(\d{1,2})(?:-(\d{1,2}))?$/.exec(filters.century);
    if (century === null || !range) return false;
    const low = Number(range[1]), high = Number(range[2] ?? range[1]);
    return low > 0 && high >= low && century >= low && century <= high;
  }
  return true;
}

const cardSelect = {
  id: true, name: true, slug: true, title: true, country: true, feastDay: true, imageUrl: true,
  patronOf: true, canonizationYear: true, deathYear: true,
  birthCountryCode: true, birthContinent: true, birthPlace: true, editorial: true,
  createdAt: true, updatedAt: true,
} satisfies Prisma.SaintSelect;

const mapSelect = {
  id: true, name: true, slug: true, title: true, imageUrl: true, birthCountryCode: true, birthContinent: true,
  birthPlace: true, birthLat: true, birthLng: true, birthPrecision: true, birthSources: true,
  deathYear: true, updatedAt: true,
} satisfies Prisma.SaintSelect;

function cursorFrom(value: unknown, scope: string): Cursor | undefined {
  if (value === undefined) return;
  if (typeof value !== "string" || value.length > 1024 || !/^[\w-]+$/.test(value)) throw new HttpError(400, "INVALID_CURSOR");
  try {
    const item: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!item || typeof item !== "object") throw new Error();
    const cursor = item as Partial<Cursor>;
    if (cursor.v !== 1 || cursor.scope !== scope || typeof cursor.after !== "string" || !cursor.after.length || cursor.after.length > 200 ||
        typeof cursor.revision !== "string" || !/^[a-f0-9]{32}$/.test(cursor.revision)) throw new Error();
    return cursor as Cursor;
  } catch { throw new HttpError(400, "INVALID_CURSOR"); }
}

/** Additive server-paged cards. Existing collection views preserve their ID order. */
export async function readSaintCards(req: Request) {
  const view = req.query.view === "map" ? "map" : "cards";
  const rawLimit = req.query.limit ?? (view === "map" ? "100" : "12");
  if (typeof rawLimit !== "string" || !/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > CATALOG_PAGE_SIZE) throw new HttpError(400, "INVALID_LIMIT");
  const limit = Number(rawLimit);
  const filters = readSaintCatalogFilters(req.query);
  const scope = createHash("sha256").update(JSON.stringify(["saint-catalog-v1", view, filters])).digest("hex");
  const cursor = cursorFrom(req.query.cursor, scope);
  return prisma.$transaction(async tx => {
    // Full biographies stay in PostgreSQL until selecting the requested page. Metadata is bounded by catalogue capacity.
    const saints = await tx.saint.findMany({ select: { id: true, name: true, updatedAt: true,
      birthCountryCode: true, birthContinent: true, deathYear: true } });
    const rows = await tx.popularityEstimate.findMany({ where: { contentType: "saint" }, select: {
      contentType: true, contentId: true, score: true, generatedAt: true, model: true, methodologyVersion: true, inputHash: true,
    } });
    const estimates: EstimateRow[] = rows.map(row => ({ ...row, contentType: "saint" }));
    const estimateById = new Map(estimates.map(row => [row.contentId, publicSaintEstimate(row)]));
    const revision = saintRankingRevision(saints, estimates);
    if (cursor && cursor.revision !== revision) throw new HttpError(409, "CATALOG_CHANGED");
    let matchingQuery: Set<string> | undefined;
    if (filters.query) {
      // PostgreSQL UTF-8 NFD decomposition mirrors the frontend's accent-insensitive search.
      // position() treats %, _, quotes and backslashes literally; all user values are parameters.
      const matching = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id" FROM "Saint" WHERE position(${filters.query} in
          regexp_replace(trim(lower(regexp_replace(normalize(concat_ws(' ', "name", "title", "biography", "country", "slug"), NFD), ${"[\u0300-\u036f]"}, '', 'g'))), ${"\\s+"}, ' ', 'g')) > 0
      `);
      matchingQuery = new Set(matching.map(row => row.id));
    }
    const ranked = saints.filter(saint => (!matchingQuery || matchingQuery.has(saint.id)) && matchesSaintMetadata(saint, filters))
      .map(saint => ({ ...saint, popularityScore: estimateById.get(saint.id)?.score ?? null })).sort(compareSaintRank);
    const position = cursor ? ranked.findIndex(saint => saint.id === cursor.after) : -1;
    if (cursor && position === -1) throw new HttpError(400, "INVALID_CURSOR");
    const selected = ranked.slice(position + 1, position + 1 + limit);
    const selectedWhere = { id: { in: selected.map(saint => saint.id) } };
    const detailRows = !selected.length ? [] : view === "map"
      ? await tx.saint.findMany({ where: selectedWhere, select: mapSelect })
      : await tx.saint.findMany({ where: selectedWhere, select: cardSelect });
    const detailById = new Map(detailRows.map(saint => [saint.id, saint]));
    const excerpts = view === "cards" && selected.length ? await tx.$queryRaw<{ id: string; biographyExcerpt: string | null }[]>(Prisma.sql`
      SELECT "id", left("biography", 600) AS "biographyExcerpt" FROM "Saint" WHERE "id" IN (${Prisma.join(selected.map(saint => saint.id))})
    `) : [];
    const excerptById = new Map(excerpts.map(row => [row.id, row.biographyExcerpt]));
    const items = selected.map(saint => ({ ...detailById.get(saint.id)!,
      ...(view === "cards" ? { biographyExcerpt: excerptById.get(saint.id) ?? null } : {}),
      popularityEstimate: estimateById.get(saint.id) ?? null }));
    const hasMore = position + 1 + items.length < ranked.length;
    const encodeCursor = (after: string) => Buffer.from(JSON.stringify({ v: 1, after, revision, scope } satisfies Cursor)).toString("base64url");
    const nextCursor = hasMore ? encodeCursor(selected[selected.length - 1].id) : null;
    const offset = position + 1;
    const hasPrevious = offset > 0;
    const previousStart = Math.max(0, offset - limit);
    const previousCursor = previousStart > 0 ? encodeCursor(ranked[previousStart - 1].id) : null;
    const countries = [...new Map(saints.filter(saint => saint.birthCountryCode && /^[A-Z]{2}$/.test(saint.birthCountryCode))
      .map(saint => ({ code: saint.birthCountryCode!, continent: catalogContinent(saint.birthContinent) || null }))
      .map(country => [country.code + ":" + (country.continent ?? ""), country])).values()]
      .sort((a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : String(a.continent).localeCompare(String(b.continent)));
    const rankedKnown = saints.some(saint => !!estimateById.get(saint.id));
    return { items, total: ranked.length, nextCursor, hasMore, revision, offset, hasPrevious, previousCursor,
      rankingMode: rankedKnown ? "ai-estimate" as const : "alphabetical-unrated" as const,
      metadata: { facets: { countries } } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
