import { Prisma } from "@prisma/client";
import { HttpError } from "./errors";
import { bool, finite, imageUrl, objectBody, strings, text } from "./validation";
import { editorialData } from "./editorial-validation";
import { slugify } from "./slugify";
export const birthContinents = ["europe", "asia", "africa", "north-america", "south-america", "oceania", "antarctica"] as const;
export const saintFields = ["name","slug","country","title","feastDay","imageUrl","biography","continent","lat","lng","deathYear","birthCountryCode","birthContinent","birthPlace","birthLat","birthLng","birthPrecision","birthSources","birthYear","canonizationYear","patronOf","symbols","editorial"] as const;
function saintValues(input: unknown, partial: boolean, validateRelations: boolean): Prisma.SaintUncheckedCreateInput {
  const body = objectBody(input, saintFields);
  const data: Record<string, unknown> = {};
  if (!partial || body.name !== undefined) data.name = text(body.name, 200, true)!;
  if (!partial || body.slug !== undefined) {
    const slug = text(body.slug, 100) ?? slugify(String(data.name));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new HttpError(400, "INVALID_SLUG");
    data.slug = slug;
  }
  for (const key of ["country","title","feastDay","continent","birthPlace"] as const) if (body[key] !== undefined) data[key] = text(body[key], 250);
  if (body.biography !== undefined) data.biography = text(body.biography, 60000, false, true);
  if (body.imageUrl !== undefined) data.imageUrl = imageUrl(body.imageUrl);
  for (const key of ["birthYear", "deathYear"] as const) if (body[key] !== undefined) {
    data[key] = finite(body[key], -5000, new Date().getUTCFullYear(), true);
    if (data[key] === 0) throw new HttpError(400, "YEAR_ZERO_NOT_SUPPORTED");
  }
  if (body.canonizationYear !== undefined) data.canonizationYear = finite(body.canonizationYear, 1, new Date().getUTCFullYear(), true);
  for (const key of ["patronOf", "symbols"] as const) if (body[key] !== undefined) data[key] = strings(body[key], 30, 250);
  if (body.editorial !== undefined) {
    data.editorial = body.editorial === null ? Prisma.DbNull : editorialData(body.editorial);
    const editorial = body.editorial === null ? null : editorialData(body.editorial);
    if (validateRelations && editorial && editorial.kind !== "person" && [body.birthYear, body.deathYear, body.birthLat, body.birthLng, body.birthCountryCode, body.birthPlace].some(value => value != null)) throw new HttpError(400, "NON_PERSON_BIRTH_NOT_APPLICABLE");
  }
  for (const key of ["lat","birthLat"] as const) if (body[key] !== undefined) data[key] = finite(body[key], -90, 90);
  for (const key of ["lng","birthLng"] as const) if (body[key] !== undefined) data[key] = finite(body[key], -180, 180);
  if (validateRelations && ((body.birthLat === null) !== (body.birthLng === null) || (body.birthLat === undefined) !== (body.birthLng === undefined))) throw new HttpError(400, "COORDINATE_PAIR_REQUIRED");
  if (body.birthCountryCode !== undefined) {
    const value = text(body.birthCountryCode, 2);
    if (value && !/^[A-Z]{2}$/.test(value)) throw new HttpError(400, "INVALID_COUNTRY_CODE");
    data.birthCountryCode = value;
  }
  if (body.birthContinent !== undefined) {
    const value = text(body.birthContinent, 20);
    if (value && !(birthContinents as readonly string[]).includes(value)) throw new HttpError(400, "INVALID_CONTINENT");
    data.birthContinent = value;
  }
  if (body.birthPrecision !== undefined) {
    const value = text(body.birthPrecision, 20);
    if (value && !["city","approximate"].includes(value)) throw new HttpError(400, "INVALID_PRECISION");
    data.birthPrecision = value;
  }
  if (body.birthSources !== undefined) {
    const values = strings(body.birthSources, 10, 2000);
    for (const value of values) {
      let url: URL; try { url = new URL(value); } catch { throw new HttpError(400, "INVALID_SOURCE"); }
      if (url.protocol !== "https:" || url.username || url.password) throw new HttpError(400, "INVALID_SOURCE");
    }
    data.birthSources = values;
  }
  if (validateRelations && typeof body.birthLat === "number" && (!data.birthPrecision || !Array.isArray(data.birthSources) || data.birthSources.length === 0 || !data.birthCountryCode || !data.birthContinent)) throw new HttpError(400, "BIRTH_PROVENANCE_REQUIRED");
  if (Object.keys(data).length === 0) throw new HttpError(400, "EMPTY_UPDATE");
  return data as Prisma.SaintUncheckedCreateInput;
}
export function saintData(input: unknown, partial = false): Prisma.SaintUncheckedCreateInput {
  return saintValues(input, partial, true);
}
const birthLocationFields = ["birthLat", "birthLng", "birthCountryCode", "birthContinent", "birthPrecision", "birthSources"] as const;
const nonPersonBirthFields = ["birthYear", "deathYear", "birthLat", "birthLng", "birthCountryCode", "birthPlace"] as const;
export function saintPatchData(input: unknown, current: Record<string, unknown>): Prisma.SaintUncheckedCreateInput {
  const submitted = objectBody(input, saintFields);
  const body = Object.fromEntries(Object.entries(submitted).filter(([, value]) => value !== undefined));
  const values = { ...body };
  // Name is a dependency only when an explicitly blank slug needs deriving.
  // It never becomes an implicit PATCH write or changes an omitted slug.
  if (body.slug !== undefined && body.name === undefined &&
      (body.slug === null || typeof body.slug === "string" && !body.slug.trim())) values.name = current.name;
  const validated = saintValues(values, true, false);
  const touched = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  if (birthLocationFields.some(touched)) {
    // Recheck the whole touched location group, including a persisted partner
    // and its provenance. Defaults are for validation only, never persistence.
    const location = Object.fromEntries(birthLocationFields.map(key => [key,
      touched(key) ? body[key] : current[key] ?? (key === "birthSources" ? [] : null)]));
    saintValues(location, true, true);
  }
  if (touched("editorial") || [...nonPersonBirthFields, ...birthLocationFields].some(touched)) {
    const editorial = touched("editorial") ? body.editorial : current.editorial;
    const merged = { ...current, ...body };
    if (editorial && typeof editorial === "object" && !Array.isArray(editorial) &&
        ["archangel", "collective"].includes(String((editorial as Record<string, unknown>).kind)) &&
        nonPersonBirthFields.some(key => merged[key] != null)) throw new HttpError(400, "NON_PERSON_BIRTH_NOT_APPLICABLE");
  }
  // Only the submitted keys may be written, including after context checks.
  return Object.fromEntries(Object.entries(validated).filter(([key]) => touched(key))) as Prisma.SaintUncheckedCreateInput;
}
export function prayerData(input: unknown, partial = false): Prisma.PrayerUncheckedCreateInput {
  const body = objectBody(input, ["title","content","category","approved","saintName","occasion"]);
  const data: Record<string, unknown> = {};
  if (!partial || body.title !== undefined) data.title = text(body.title, 200, true)!;
  if (!partial || body.content !== undefined) data.content = text(body.content, 60000, true, true)!;
  for (const key of ["category","saintName","occasion"] as const) if (body[key] !== undefined) data[key] = text(body[key], 200);
  if (body.approved !== undefined) data.approved = bool(body.approved);
  if (Object.keys(data).length === 0) throw new HttpError(400, "EMPTY_UPDATE");
  return data as Prisma.PrayerUncheckedCreateInput;
}
export function miracleData(input: unknown, partial = false): Omit<Prisma.MiracleUncheckedCreateInput, "saintId"> {
  const body = objectBody(input, ["title","type","date","location","witnesses","approved","details"]);
  const data: Record<string, unknown> = {};
  if (!partial || body.title !== undefined) data.title = text(body.title, 200, true)!;
  for (const key of ["type","date","location"] as const) if (body[key] !== undefined) data[key] = text(body[key], 250);
  if (body.witnesses !== undefined) data.witnesses = text(body.witnesses, 2000);
  if (body.details !== undefined) data.details = text(body.details, 60000, false, true);
  if (body.approved !== undefined) data.approved = bool(body.approved);
  if (Object.keys(data).length === 0) throw new HttpError(400, "EMPTY_UPDATE");
  return data as Omit<Prisma.MiracleUncheckedCreateInput, "saintId">;
}
