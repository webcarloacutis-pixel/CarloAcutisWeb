import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readVerses } from "./content-source";

const fixtures: Array<{ dir: string; file: string }> = [];
async function fixture(text: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "acutis-popularity-parser-"));
  const file = join(dir, "verses.ts"); fixtures.push({ dir, file }); await writeFile(file, text, "utf8"); return file;
}
afterEach(async () => {
  for (const { file, dir } of fixtures.splice(0)) { await unlink(file); await rmdir(dir); }
});
describe("public verse content source", () => {
  it("reads the same repository source and existing featured IDs without executing it", async () => {
    const path = resolve(__dirname, "../../../carlo-front/lib/scripture-data.ts");
    const content = await readVerses(path);
    expect(content.map(item => item.contentId)).toEqual(expect.arrayContaining(["1", "2", "3", "4"]));
    expect(content.every(item => item.contentType === "verse" && item.text.length > 0)).toBe(true);
  });
  it("rejects executable properties and duplicate IDs", async () => {
    const executable = await fixture('export const scriptureData = [{id:"1",reference:"x",text: process.exit(1),category:"c"}]');
    await expect(readVerses(executable)).rejects.toThrow("INVALID_VERSE_SOURCE");
    const duplicate = await fixture('export const scriptureData = [{id:"1",reference:"x",text:"safe",category:"c"},{id:"1",reference:"x",text:"safe",category:"c"}]');
    await expect(readVerses(duplicate)).rejects.toThrow("DUPLICATE_VERSE_ID");
  });
  it("preserves literal text, accents and newlines", async () => {
    const file = await fixture('export const scriptureData = [{id:"1",reference:"María",text:"Primera\\nSegunda",category:"Oración"}]');
    expect((await readVerses(file))[0]).toMatchObject({ title: "María", text: "Primera\nSegunda", category: "Oración" });
  });
});
