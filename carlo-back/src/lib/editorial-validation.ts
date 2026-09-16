import { HttpError } from "./errors";
import { objectBody, strings, text } from "./validation";
export const factStatuses = ["verified", "approximate", "traditional", "unknown", "not-applicable"] as const;
export type FactStatus = typeof factStatuses[number];
export type EditorialSource = { url: string; institution: string; title: string; accessedAt: string; claims: string[] };
export type EditorialDate = { text: string | null; status: FactStatus };
export type EditorialImage = { sourceUrl: string; creator: string; license: string; licenseUrl: string; attribution: string; alt: string; kind: "painting" | "sculpture" | "photograph" | "illustration" | "mosaic" };
export type Editorial = { kind: "person" | "archangel" | "collective"; ecclesialStatus: string; birthDate: EditorialDate; deathDate: EditorialDate; birthplaceStatus: FactStatus; notes: string | null; sources: EditorialSource[]; image: EditorialImage | null };
function choice<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== "string" || !options.includes(value as T)) throw new HttpError(400, "INVALID_EDITORIAL_CHOICE");
  return value as T;
}
function https(input: unknown): string {
  const value = text(input, 2000, true)!;
  let url: URL; try { url = new URL(value); } catch { throw new HttpError(400, "INVALID_SOURCE"); }
  if (url.protocol !== "https:" || url.username || url.password) throw new HttpError(400, "INVALID_SOURCE");
  return value;
}
function editorialDate(input: unknown): EditorialDate {
  const body = objectBody(input, ["text", "status"]);
  const status = choice(body.status, factStatuses), value = text(body.text, 250);
  if (!["unknown", "not-applicable"].includes(status) && !value) throw new HttpError(400, "FACT_TEXT_REQUIRED");
  return {text: value, status};
}
export function editorialData(input: unknown): Editorial {
  const body = objectBody(input, ["kind", "ecclesialStatus", "birthDate", "deathDate", "birthplaceStatus", "notes", "sources", "image"]);
  if (!Array.isArray(body.sources) || body.sources.length > 20) throw new HttpError(400, "INVALID_SOURCES");
  const sources = body.sources.map((input): EditorialSource => {
    const s = objectBody(input, ["url", "institution", "title", "accessedAt", "claims"]);
    const accessedAt = text(s.accessedAt, 10, true)!;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(accessedAt) || Number.isNaN(Date.parse(accessedAt)) || new Date(accessedAt).toISOString().slice(0,10) !== accessedAt) throw new HttpError(400, "INVALID_SOURCE_DATE");
    return {url: https(s.url), institution: text(s.institution, 300, true)!, title: text(s.title, 500, true)!, accessedAt, claims: strings(s.claims, 15, 600)};
  });
  let image: EditorialImage | null = null;
  if (body.image != null) {
    const i = objectBody(body.image, ["sourceUrl", "creator", "license", "licenseUrl", "attribution", "alt", "kind"]);
    image = {sourceUrl: https(i.sourceUrl), creator: text(i.creator, 500, true)!, license: text(i.license, 250, true)!, licenseUrl: https(i.licenseUrl), attribution: text(i.attribution, 2000, true)!, alt: text(i.alt, 500, true)!, kind: choice(i.kind, ["painting", "sculpture", "photograph", "illustration", "mosaic"])};
  }
  const value: Editorial = {kind: choice(body.kind, ["person", "archangel", "collective"]), ecclesialStatus: text(body.ecclesialStatus, 250, true)!, birthDate: editorialDate(body.birthDate), deathDate: editorialDate(body.deathDate), birthplaceStatus: choice(body.birthplaceStatus, factStatuses), notes: text(body.notes, 6000), sources, image};
  if (value.kind !== "person" && (value.birthDate.status !== "not-applicable" || value.deathDate.status !== "not-applicable" || value.birthplaceStatus !== "not-applicable")) throw new HttpError(400, "NON_PERSON_DATES_NOT_APPLICABLE");
  return value;
}
