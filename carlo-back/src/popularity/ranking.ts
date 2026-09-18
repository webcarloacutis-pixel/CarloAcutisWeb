import { createHash } from "node:crypto";
import { isValidEstimate, type EstimateRow } from "./domain";

export type PublicSaintEstimate = {
  score: number; generatedAt: string; model: string; methodologyVersion: string; inputHash: string;
};
export interface SaintRank { id: string; name: string; popularityScore: number | null }

/** Locale-independent tie-breaker, identical for every page and deployment. */
export function normalizeRankingName(name: string): string {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/gu, " ");
}

function compareText(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }
function validScore(value: number | null): value is number {
  return Number.isInteger(value) && value !== null && value >= 0 && value <= 100;
}

/** Zero is a valid estimate; an unknown/invalid score always sorts after it. */
export function compareSaintRank(a: SaintRank, b: SaintRank): number {
  const aScore = validScore(a.popularityScore) ? a.popularityScore : null;
  const bScore = validScore(b.popularityScore) ? b.popularityScore : null;
  if (aScore !== bScore) {
    if (aScore === null) return 1;
    if (bScore === null) return -1;
    return bScore - aScore;
  }
  return compareText(normalizeRankingName(a.name), normalizeRankingName(b.name)) || compareText(a.id, b.id);
}

export function publicSaintEstimate(row: EstimateRow | null): PublicSaintEstimate | null {
  if (!isValidEstimate(row) || row.contentType !== "saint") return null;
  return { score: row.score, generatedAt: row.generatedAt.toISOString(), model: row.model,
    methodologyVersion: row.methodologyVersion, inputHash: row.inputHash };
}

/** Include estimate provenance, not leases: another result invalidates existing cursors. */
export function saintRankingRevision(
  saints: ReadonlyArray<{ id: string; name: string; updatedAt: Date }>,
  estimates: readonly EstimateRow[],
): string {
  const byId = new Map(estimates.filter(row => row.contentType === "saint").map(row => [row.contentId, row]));
  const snapshot = [...saints].sort((a, b) => compareText(a.id, b.id)).map(saint => [
    saint.id, saint.name, saint.updatedAt.toISOString(), publicSaintEstimate(byId.get(saint.id) ?? null),
  ]);
  // Compatibility checksum, not a security/signature primitive.
  return createHash("md5").update(JSON.stringify(snapshot)).digest("hex");
}
