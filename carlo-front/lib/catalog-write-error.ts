export async function catalogWriteError(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === "object" && "error" in body) {
    if (body.error === "SAINT_LIMIT_REACHED") return "Se alcanzó el límite de 3000 santos. No se pueden crear más registros."
    if (body.error === "MIRACLE_LIMIT_REACHED") return "Se alcanzó el límite de 3000 milagros. No se pueden crear más registros."
  }
  return fallback
}
