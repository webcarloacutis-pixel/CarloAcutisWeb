/** Keep public catalogue context without accepting redirects to another route/origin. */
export function catalogReturn(value: unknown): string {
  if (typeof value !== "string" || value.length > 8000 || !value.startsWith("/santos") || /[\\\r\n]/.test(value)) return "/santos"
  const url = new URL(value, "https://catalog.invalid")
  if (url.origin !== "https://catalog.invalid" || url.pathname !== "/santos" || url.hash) return "/santos"
  const allowed = new Set(["q", "continent", "country", "century", "cursor", "sort", "lang"])
  if ([...url.searchParams.keys()].some(key => !allowed.has(key))) return "/santos"
  return url.pathname + url.search
}
