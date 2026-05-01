export function apiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").trim();

  // Si está configurada la API pública, úsala siempre
  if (apiBase) return apiBase.replace(/\/+$/, "") + p;

  // Fallback SSR: usar el origin del deploy (Vercel) o localhost
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ||
         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"));

  return origin.replace(/\/+$/, "") + p;
}
