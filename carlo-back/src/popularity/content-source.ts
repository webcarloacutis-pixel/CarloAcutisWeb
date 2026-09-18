import { readFile } from "node:fs/promises";
import ts from "typescript";
import type { Prisma, PrismaClient } from "@prisma/client";
import { PopularityError, validateContent, type ContentKey, type ContentSource, type PopularityContent } from "./domain";

// Parse literal public data; never eval, import or execute a supplied TypeScript file.
export async function readVerses(file: string): Promise<PopularityContent[]> {
  const text = await readFile(file, "utf8");
  if (Buffer.byteLength(text, "utf8") > 2000000) throw new PopularityError("VERSE_FILE_TOO_LARGE");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let initializer: ts.Expression | undefined;
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === "scriptureData") initializer = declaration.initializer;
    }
  }
  while (initializer && (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer) || ts.isParenthesizedExpression(initializer))) {
    initializer = initializer.expression;
  }
  if (!initializer || !ts.isArrayLiteralExpression(initializer)) throw new PopularityError("INVALID_VERSE_SOURCE");
  const seen = new Set<string>();
  return initializer.elements.map(element => {
    if (!ts.isObjectLiteralExpression(element)) throw new PopularityError("INVALID_VERSE_SOURCE");
    const values: Record<string, string> = {};
    for (const property of element.properties) {
      if (!ts.isPropertyAssignment(property) || !property.name) throw new PopularityError("INVALID_VERSE_SOURCE");
      const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : "";
      if (["id", "text", "reference", "category"].includes(key)) {
        if (!ts.isStringLiteral(property.initializer) && !ts.isNoSubstitutionTemplateLiteral(property.initializer)) {
          throw new PopularityError("INVALID_VERSE_SOURCE");
        }
        if (key in values) throw new PopularityError("INVALID_VERSE_SOURCE");
        values[key] = property.initializer.text;
      }
    }
    const content = validateContent({
      contentType: "verse", contentId: values.id, title: values.reference,
      text: values.text, category: values.category ?? null,
    });
    if (seen.has(content.contentId)) throw new PopularityError("DUPLICATE_VERSE_ID");
    seen.add(content.contentId);
    return content;
  });
}

export const prayerSelect = { id: true, title: true, content: true, category: true } as const;
export function prayerContent(row: { id: string; title: string; content: string; category: string | null }): PopularityContent {
  return validateContent({ contentType: "prayer", contentId: row.id, title: row.title, text: row.content, category: row.category });
}
export const saintSelect = {
  id: true, slug: true, name: true, title: true, biography: true, country: true,
  patronOf: true, canonizationYear: true, deathYear: true,
} satisfies Prisma.SaintSelect;
export function saintContent(row: Prisma.SaintGetPayload<{ select: typeof saintSelect }>): PopularityContent {
  // The bounded public identity context is hashed in full: an oversized source fails before any paid call.
  return validateContent({ contentType: "saint", contentId: row.id, title: row.name,
    text: JSON.stringify({ slug: row.slug, biography: row.biography, country: row.country,
      patronOf: row.patronOf, canonizationYear: row.canonizationYear, deathYear: row.deathYear }),
    category: row.title,
  });
}

export function createContentSource(client: PrismaClient | null, verseFile: string): ContentSource {
  return {
    async read(key: ContentKey): Promise<PopularityContent | null> {
      if (key.contentType === "verse") {
        return (await readVerses(verseFile)).find(item => item.contentId === key.contentId) ?? null;
      }
      if (!client) throw new PopularityError("DATABASE_REQUIRED");
      if (key.contentType === "saint") {
        const row = await client.saint.findUnique({ where: { id: key.contentId }, select: saintSelect });
        return row ? saintContent(row) : null;
      }
      const row = await client.prayer.findFirst({ where: { id: key.contentId, approved: true }, select: prayerSelect });
      return row ? prayerContent(row) : null;
    },
  };
}
