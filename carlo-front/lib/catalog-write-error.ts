export async function catalogWriteError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === "object" && "error" in body) {
    if (body.error === "SAINT_LIMIT_REACHED") return "catalog.saintLimitReached"
    if (body.error === "MIRACLE_LIMIT_REACHED") return "catalog.miracleLimitReached"
  }
  return fallback
}
