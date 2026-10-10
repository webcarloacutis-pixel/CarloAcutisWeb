import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createSaint, updateSaint } from "./saint-service";
import { integrationDatabaseEnabled } from "./test-database";

// This fixture belongs to the empty capacity database, not the separate repair/browser copies.
// Keep the beforeAll identity/TLS checks intact when that exact profile is selected.
const enabled = integrationDatabaseEnabled() && new URL(process.env.DATABASE_URL!).pathname === "/acutis_catalog_capacity_test";
let targetVerified = false;
const prefix = "editorial-regression-" + randomUUID() + "-";
const id = (name: string) => prefix + name;
const legacy = {
  kind: "person", notes: "Existing partial metadata must survive an unrelated edit.",
  image: { sourceUrl: "https://example.invalid/existing-image", attribution: "Preserved attribution" },
  existingKey: { preserve: true, values: ["unchanged"] },
};
const complete = {
  kind: "person", ecclesialStatus: "Synthetic fixture only",
  birthDate: { text: null, status: "unknown" }, deathDate: { text: null, status: "unknown" },
  birthplaceStatus: "unknown", notes: null, sources: [], image: null,
};

describe.skipIf(!enabled).sequential("saint edits preserve existing editorial JSON (disposable SQL)", () => {
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL ?? "");
    expect([target.hostname, target.port, target.pathname]).toEqual(["127.0.0.1", "55439", "/acutis_catalog_capacity_test"]);
    const identity = await prisma.$queryRaw<Array<{ name: string; role: string; schema: string; address: string; port: number; ssl: boolean }>>`
      SELECT current_database() AS name, current_user AS role, current_schema() AS schema,
        host(inet_server_addr()) AS address, inet_server_port() AS port,
        ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()`;
    expect(identity[0]).toEqual({ name: "acutis_catalog_capacity_test", role: "acutis_local_owner", schema: "public", address: "127.0.0.1", port: 55439, ssl: true });
    targetVerified = true;
    await prisma.saint.createMany({ data: [
      { id: id("legacy"), name: "Synthetic legacy", slug: id("legacy"), biography: "Original biography.", editorial: legacy },
      { id: id("null"), name: "Synthetic null", slug: id("null") },
      ...["archangel", "collective"].map(kind => ({ id: id(kind), name: "Synthetic " + kind, slug: id(kind), editorial: { kind, notes: "Legacy partial metadata." } })),
      { id: id("strict"), name: "Synthetic strict", slug: id("strict"), editorial: complete },
      // Reproduce the genuine Santa Perpetua legacy values in this disposable
      // fixture; the public catalogue and production rows are never modified.
      { id: id("legacy-location"), name: "Synthetic legacy location", slug: id("legacy-location"), biography: "Original legacy biography.", birthYear: 181, deathYear: 203, birthContinent: "África", birthPrecision: "place-name", editorial: legacy },
      { id: id("legacy-scalar"), name: "Synthetic legacy scalar", slug: id("legacy-scalar"), biography: "Original scalar biography.", country: "Legacy country ".repeat(30), imageUrl: "ftp://example.invalid/legacy-image", editorial: legacy },
      { id: id("legacy-non-person"), name: "Synthetic legacy non-person", slug: id("legacy-non-person"), biography: "Original non-person biography.", birthPlace: "Persisted legacy place", editorial: { kind: "archangel", notes: "Legacy partial metadata." } },
    ] });
    expect(await prisma.$executeRaw`UPDATE "Saint" SET "birthSources" = NULL WHERE "id" = ${id("legacy-location")}`).toBe(1);
  });
  afterAll(async () => {
    if (targetVerified) await prisma.saint.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  });
  it("edits another field without validating, dropping or normalizing persisted legacy metadata", async () => {
    const updated = await updateSaint(id("legacy"), { title: "Updated title", imageUrl: "/catalog/synthetic.webp" });
    expect(updated.editorial).toEqual(legacy);
    expect(updated).toMatchObject({ title: "Updated title", imageUrl: "/catalog/synthetic.webp", biography: "Original biography." });
    const persisted = await prisma.saint.findUniqueOrThrow({ where: { id: id("legacy") } });
    expect(persisted.editorial).toEqual(legacy);
  });
  it("keeps SQL null editorial and optional fields null during an unrelated edit", async () => {
    const updated = await updateSaint(id("null"), { title: "New title" });
    expect(updated).toMatchObject({ editorial: null, birthYear: null, deathYear: null, birthLat: null, birthLng: null });
  });
  it("patches only biography while preserving a SQL-null source list and every other persisted field", async () => {
    // The historical production shape is reproduced only in this owned local fixture.
    // Check the SQL representation directly; a display adapter cannot prove preservation.
    expect(await prisma.$executeRaw`UPDATE "Saint" SET "birthSources" = NULL WHERE "id" = ${id("legacy")}`).toBe(1);
    const readRaw = () => prisma.$queryRaw<Array<{ sourceListIsSqlNull: boolean; persisted: Record<string, unknown> }>>`
      SELECT "birthSources" IS NULL AS "sourceListIsSqlNull", to_jsonb(s) - 'updatedAt' AS persisted
      FROM "Saint" s WHERE "id" = ${id("legacy")}`;
    const [before] = await readRaw();
    expect(before.sourceListIsSqlNull).toBe(true);
    expect(before.persisted.editorial).toEqual(legacy);
    expect((await prisma.saint.findUniqueOrThrow({ where: { id: id("legacy") } })).birthSources).toBeNull();
    await updateSaint(id("legacy"), { biography: "Only this biography is explicitly changed." });
    const [after] = await readRaw();
    expect(after.sourceListIsSqlNull, "An untouched SQL NULL must not become an empty array").toBe(true);
    expect(after.persisted).toEqual({ ...before.persisted, biography: "Only this biography is explicitly changed." });
    expect(after.persisted.editorial).toEqual(legacy);
  });
  it("preserves JSON null distinctly from SQL null during an unrelated edit", async () => {
    expect(await prisma.$executeRaw`UPDATE "Saint" SET "birthSources" = 'null'::jsonb, "editorial" = 'null'::jsonb WHERE "id" = ${id("null")}`).toBe(1);
    await updateSaint(id("null"), { biography: "Only the explicit biography changes." });
    const [raw] = await prisma.$queryRaw<Array<{ sourcesSqlNull: boolean; editorialSqlNull: boolean; sourcesType: string; editorialType: string }>>`
      SELECT "birthSources" IS NULL AS "sourcesSqlNull", "editorial" IS NULL AS "editorialSqlNull",
        jsonb_typeof("birthSources") AS "sourcesType", jsonb_typeof("editorial") AS "editorialType"
      FROM "Saint" WHERE "id" = ${id("null")}`;
    expect(raw).toEqual({ sourcesSqlNull: false, editorialSqlNull: false, sourcesType: "null", editorialType: "null" });
  });
  it("edits and restores biography on the authentic invalid legacy location shape without rewriting omitted values", async () => {
    const readRaw = () => prisma.$queryRaw<Array<{ persisted: Record<string, unknown>; sourcesSqlNull: boolean; sourcesType: string | null; editorialSqlNull: boolean; editorialType: string | null }>>`
      SELECT to_jsonb(s) - 'updatedAt' AS persisted, "birthSources" IS NULL AS "sourcesSqlNull",
        jsonb_typeof("birthSources") AS "sourcesType", "editorial" IS NULL AS "editorialSqlNull",
        jsonb_typeof("editorial") AS "editorialType" FROM "Saint" s WHERE "id" = ${id("legacy-location")}`;
    const [before] = await readRaw();
    expect(before).toMatchObject({ sourcesSqlNull: true, sourcesType: null, editorialSqlNull: false, editorialType: "object" });
    expect(before.persisted).toMatchObject({ birthContinent: "África", birthPrecision: "place-name", editorial: legacy });
    await updateSaint(id("legacy-location"), { biography: "Only the explicit biography changes." });
    expect((await readRaw())[0]).toEqual({ ...before, persisted: { ...before.persisted, biography: "Only the explicit biography changes." } });
    await updateSaint(id("legacy-location"), { biography: before.persisted.biography });
    expect((await readRaw())[0]).toEqual(before);
  });
  it("preserves invalid omitted legacy scalars from other groups while editing biography", async () => {
    const readRaw = () => prisma.$queryRaw<Array<{ persisted: Record<string, unknown> }>>`
      SELECT to_jsonb(s) - 'updatedAt' AS persisted FROM "Saint" s WHERE "id" = ${id("legacy-scalar")}`;
    const [before] = await readRaw();
    await updateSaint(id("legacy-scalar"), { biography: "Explicit scalar fixture biography." });
    expect((await readRaw())[0].persisted).toEqual({ ...before.persisted, biography: "Explicit scalar fixture biography." });
    await updateSaint(id("legacy-scalar"), { biography: before.persisted.biography });
    expect((await readRaw())[0]).toEqual(before);
  });
  it("still rejects invalid newly submitted legacy enums, oversized scalars and unsafe image URLs", async () => {
    const readRaw = () => prisma.$queryRaw<Array<{ persisted: Record<string, unknown> }>>`
      SELECT to_jsonb(s) AS persisted FROM "Saint" s WHERE "id" = ${id("legacy-location")}`;
    const before = await readRaw();
    for (const [patch, code] of [[{ birthContinent: "África" }, "INVALID_CONTINENT"], [{ birthPrecision: "place-name" }, "INVALID_PRECISION"],
      [{ country: "x".repeat(251) }, "INVALID_TEXT"], [{ imageUrl: "ftp://example.invalid/new-image" }, "INVALID_URL"]] as const) {
      await expect(updateSaint(id("legacy-location"), patch)).rejects.toMatchObject({ status: 400, code });
    }
    expect(await readRaw()).toEqual(before);
  });
  it("does not rewrite omitted slug on name edits, and derives a blank explicit slug from the actual name", async () => {
    const before = await prisma.saint.findUniqueOrThrow({ where: { id: id("legacy-scalar") } });
    expect((await updateSaint(before.id, { name: "Updated scalar legacy name" })).slug).toBe(before.slug);
    expect((await updateSaint(before.id, { slug: "" })).slug).toBe("updated-scalar-legacy-name");
    const restored = await updateSaint(before.id, { name: before.name, slug: before.slug });
    expect(restored).toMatchObject({ name: before.name, slug: before.slug, country: before.country, imageUrl: before.imageUrl, editorial: before.editorial });
  });
  it("preserves incompatible omitted non-person legacy data on unrelated edits but rejects touched birth or editorial groups", async () => {
    const readRaw = () => prisma.$queryRaw<Array<{ persisted: Record<string, unknown> }>>`
      SELECT to_jsonb(s) - 'updatedAt' AS persisted FROM "Saint" s WHERE "id" = ${id("legacy-non-person")}`;
    const [before] = await readRaw();
    await updateSaint(id("legacy-non-person"), { biography: "Only the unrelated biography changes." });
    expect((await readRaw())[0].persisted).toEqual({ ...before.persisted, biography: "Only the unrelated biography changes." });
    for (const patch of [{ birthYear: 1900 }, { editorial: { ...complete, kind: "archangel", birthDate: { text: null, status: "not-applicable" }, deathDate: { text: null, status: "not-applicable" }, birthplaceStatus: "not-applicable" } }]) {
      await expect(updateSaint(id("legacy-non-person"), patch)).rejects.toMatchObject({ status: 400, code: "NON_PERSON_BIRTH_NOT_APPLICABLE" });
    }
    await updateSaint(id("legacy-non-person"), { biography: before.persisted.biography });
    expect((await readRaw())[0]).toEqual(before);
  });
  it("validates a coordinate-only patch against persisted provenance without rewriting it", async () => {
    await prisma.saint.update({ where: { id: id("strict") }, data: {
      birthLat: 10, birthLng: 20, birthCountryCode: "CO", birthContinent: "south-america",
      birthPrecision: "approximate", birthSources: ["https://example.invalid/local-fixture-source"],
    } });
    const readRaw = () => prisma.$queryRaw<Array<{ persisted: Record<string, unknown> }>>`
      SELECT to_jsonb(s) - 'updatedAt' AS persisted FROM "Saint" s WHERE "id" = ${id("strict")}`;
    const [before] = await readRaw();
    await updateSaint(id("strict"), { birthLat: 11 });
    expect((await readRaw())[0].persisted).toEqual({ ...before.persisted, birthLat: 11 });
    for (const patch of [{ birthLat: null }, { birthSources: [] }, { birthCountryCode: null }]) {
      await expect(updateSaint(id("strict"), patch)).rejects.toMatchObject({ status: 400 });
    }
    expect((await readRaw())[0].persisted).toEqual({ ...before.persisted, birthLat: 11 });
  });
  it("rejects empty, protected and unknown PATCH fields without changing the persisted record", async () => {
    const readRaw = () => prisma.$queryRaw<Array<{ persisted: Record<string, unknown> }>>`
      SELECT to_jsonb(s) AS persisted FROM "Saint" s WHERE "id" = ${id("legacy")}`;
    const before = await readRaw();
    for (const [patch, code] of [[{}, "EMPTY_UPDATE"], [{ title: undefined }, "EMPTY_UPDATE"],
      [{ id: "forged" }, "UNKNOWN_FIELD"], [{ createdAt: new Date().toISOString() }, "UNKNOWN_FIELD"],
      [{ hiddenApproval: true }, "UNKNOWN_FIELD"], [{ name: "" }, "REQUIRED_FIELD"]] as const) {
      await expect(updateSaint(id("legacy"), patch)).rejects.toMatchObject({ status: 400, code });
    }
    expect(await readRaw()).toEqual(before);
  });
  it.each(["archangel", "collective"])("keeps %s legacy metadata and rejects invented human birth data", async kind => {
    const current = await prisma.saint.findUniqueOrThrow({ where: { id: id(kind) } });
    const updated = await updateSaint(id(kind), { title: "Unrelated title" });
    expect(updated.editorial).toEqual(current.editorial);
    expect(updated).toMatchObject({ birthYear: null, deathYear: null, birthLat: null, birthLng: null, birthCountryCode: null, birthPlace: null });
    for (const patch of [{ birthYear: 1900 }, { deathYear: 2000 }, { birthPlace: "Invented birthplace" }, { birthCountryCode: "CO" }]) {
      await expect(updateSaint(id(kind), patch)).rejects.toMatchObject({ status: 400, code: "NON_PERSON_BIRTH_NOT_APPLICABLE" });
    }
    const after = await prisma.saint.findUniqueOrThrow({ where: { id: id(kind) } });
    expect(after.editorial).toEqual(current.editorial);
    expect(after.birthYear).toBeNull(); expect(after.birthPlace).toBeNull();
  });
  it("rejects newly submitted partial or forged editorial instead of treating it as trusted persisted JSON", async () => {
    for (const editorial of [{ kind: "person", notes: "New incomplete submission" }, { ...complete, hiddenApproval: true }]) {
      await expect(updateSaint(id("strict"), { editorial })).rejects.toMatchObject({ status: 400 });
      await expect(createSaint({ name: "Rejected synthetic", slug: id("rejected"), editorial })).rejects.toMatchObject({ status: 400 });
    }
    expect((await prisma.saint.findUniqueOrThrow({ where: { id: id("strict") } })).editorial).toEqual(complete);
    expect(await prisma.saint.count({ where: { slug: id("rejected") } })).toBe(0);
  });
  it("accepts complete explicit editorial input and rejects human dates on newly submitted archangel metadata", async () => {
    const changed = { ...complete, notes: "Explicit valid update" };
    expect((await updateSaint(id("strict"), { editorial: changed })).editorial).toEqual(changed);
    await expect(updateSaint(id("strict"), { editorial: { ...complete, kind: "archangel" } })).rejects.toMatchObject({ status: 400, code: "NON_PERSON_DATES_NOT_APPLICABLE" });
    expect((await prisma.saint.findUniqueOrThrow({ where: { id: id("strict") } })).editorial).toEqual(changed);
  });
});
