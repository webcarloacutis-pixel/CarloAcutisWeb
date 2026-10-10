export type CatalogKind = "saint" | "miracle" | "prayer"
export type TranslationField = { source: string; sourceHash: string; text: string; review: "assistant" | "automatic" | "human" }
export type CatalogTranslationPack = { version: 1; kind: CatalogKind; id: string; locale: string; fields: Record<string, TranslationField> }
const publicFields = new Set(["name", "title", "biography", "country", "feastDay", "birthPlace", "type", "date", "location", "witnesses", "details", "content", "category", "saintName", "occasion"])
function safeField(path: string) {
  return publicFields.has(path) || /^(patronOf|symbols)\.\d{1,3}$/.test(path) || /^editorial\.(notes|ecclesialStatus|birthDate\.text|deathDate\.text|image\.(alt|attribution))$/.test(path) || /^editorial\.sources\.\d{1,3}\.(title|claims\.\d{1,3})$/.test(path)
}
export function fieldValue(value: unknown, path: string): unknown {
  for (const key of path.split(".")) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key)) return undefined
    value = (value as Record<string, unknown>)[key]
  }
  return value
}
function setField(target: object, path: string, text: string) {
  const keys = path.split("."), last = keys.pop()!
  let value = target as Record<string, unknown>
  for (const key of keys) value = value[key] as Record<string, unknown>
  value[last] = text
}
export function validateTranslationPack(value: unknown, kind: CatalogKind, id: string, locale: string): CatalogTranslationPack {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("INVALID_LOCAL_TRANSLATION")
  const pack = value as Partial<CatalogTranslationPack>
  if (pack.version !== 1 || pack.kind !== kind || pack.id !== id || pack.locale !== locale || !pack.fields || typeof pack.fields !== "object" || Array.isArray(pack.fields) || Object.keys(pack.fields).length > 500) throw Error("INVALID_LOCAL_TRANSLATION")
  for (const [path, field] of Object.entries(pack.fields)) if (!safeField(path) || !field || typeof field.source !== "string" || !field.source || typeof field.text !== "string" || !field.text.trim() || field.text.length > 400000 || typeof field.sourceHash !== "string" || !/^[a-f0-9]{32}$/.test(field.sourceHash) || !["assistant", "automatic", "human"].includes(field.review)) throw Error("INVALID_LOCAL_TRANSLATION")
  return pack as CatalogTranslationPack
}
/** Exact source comparison invalidates individual fields, without changing IDs/URLs or originals. */
export function localizeCatalogRecord<T extends object>(source: T, pack?: CatalogTranslationPack) {
  const content = structuredClone(source), translated: string[] = [], stale: string[] = []
  const selected = pack && pack.id === fieldValue(source, "id") ? pack : undefined
  for (const [path, field] of Object.entries(selected?.fields || {})) {
    if (path === "biography" && typeof fieldValue(source, "biographyExcerpt") === "string") {
      if (fieldValue(source, "biographySourceHash") === field.sourceHash && fieldValue(source, "biographyExcerpt") === Array.from(field.source).slice(0, 600).join("")) {
        setField(content, "biographyExcerpt", Array.from(field.text).slice(0, 600).join("")); translated.push("biographyExcerpt")
      } else stale.push("biographyExcerpt")
    }
    if (fieldValue(source, path) === field.source) { setField(content, path, field.text); translated.push(path) }
    else if (fieldValue(source, path) !== undefined && fieldValue(source, path) !== null) stale.push(path)
  }
  const candidates: string[] = []
  function collect(value: unknown, path = "") {
    if (typeof value === "string" && value && (safeField(path) || path === "biographyExcerpt")) candidates.push(path)
    else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) collect(item, path ? path + "." + key : key)
  }
  collect(source)
  return { content, translated, stale, missing: candidates.filter(path => !translated.includes(path)) }
}
