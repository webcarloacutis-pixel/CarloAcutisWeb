import { createHash } from "node:crypto";
import configuration from "./santos_orden_popularidad_editorial.json";
import { compareSaintRank } from "../popularity/ranking";

export type EditorialSaint = Readonly<{ orden: number; id: string; name: string; slug: string; fijado: boolean }>;
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Presentation configuration only: never imports or changes database content. */
export function validateEditorialSaintOrder(value: unknown): readonly EditorialSaint[] {
  const invalid = () => { throw new Error("INVALID_EDITORIAL_SAINT_ORDER"); };
  if (!record(value) || value.version !== 1 || value.total !== 179 || !Array.isArray(value.santos) || value.santos.length !== 179) return invalid();
  const ids = new Set<string>(), slugs = new Set<string>();
  const entries: EditorialSaint[] = [];
  for (const [index, row] of value.santos.entries()) {
    if (!record(row) || row.orden !== index + 1 || typeof row.id !== "string" || !row.id || ids.has(row.id) ||
        typeof row.slug !== "string" || !row.slug || slugs.has(row.slug) || typeof row.name !== "string" || !row.name.trim() ||
        typeof row.fijado !== "boolean" || row.fijado !== (index === 0)) return invalid();
    ids.add(row.id); slugs.add(row.slug);
    entries.push(Object.freeze({ orden: index + 1, id: row.id, name: row.name, slug: row.slug, fijado: row.fijado }));
  }
  if (entries[0].id !== "catalog-expansion-2026-200" || entries[0].name !== "San Carlo Acutis" || entries[0].slug !== "san-carlo-acutis") return invalid();
  return Object.freeze(entries);
}

export const saintEditorialOrder = validateEditorialSaintOrder(configuration);
const positionById = new Map(saintEditorialOrder.map(row => [row.id, row.orden]));
// Include the complete configuration identity/order so a later release invalidates old cursors.
export const editorialOrderRevision = createHash("md5").update(JSON.stringify(saintEditorialOrder)).digest("hex");

/** Ranked eligible identities first; legitimate additional records remain at the end. */
export function compareEditorialSaints(a: { id: string; name: string }, b: { id: string; name: string }): number {
  const left = positionById.get(a.id), right = positionById.get(b.id);
  if (left !== right) {
    if (left === undefined) return 1;
    if (right === undefined) return -1;
    return left - right;
  }
  return compareSaintRank({ ...a, popularityScore: null }, { ...b, popularityScore: null });
}
