import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createSaint, updateSaint } from "./saint-service";
import { integrationDatabaseEnabled } from "./test-database";

const enabled = integrationDatabaseEnabled();
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
    const identity = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    expect(identity[0].name).toBe("acutis_catalog_capacity_test");
    await prisma.saint.createMany({ data: [
      { id: id("legacy"), name: "Synthetic legacy", slug: id("legacy"), biography: "Original biography.", editorial: legacy },
      { id: id("null"), name: "Synthetic null", slug: id("null") },
      ...["archangel", "collective"].map(kind => ({ id: id(kind), name: "Synthetic " + kind, slug: id(kind), editorial: { kind, notes: "Legacy partial metadata." } })),
      { id: id("strict"), name: "Synthetic strict", slug: id("strict"), editorial: complete },
    ] });
  });
  afterAll(async () => {
    await prisma.saint.deleteMany({ where: { id: { startsWith: prefix } } });
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
