export function formatTranslation(text: string, values: Record<string, string | number> = {}) {
  return text.replace(/\{(\w+)\}/g, (placeholder, key: string) => Object.hasOwn(values, key) ? String(values[key]) : placeholder)
}
