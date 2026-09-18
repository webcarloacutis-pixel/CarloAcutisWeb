export const catalogStorageOrigin = "https://rquzpsjismymbyijwhgj.supabase.co";
export const catalogStorageBucket = "acutis-catalog";
export const catalogImageFallback = "/placeholder.svg";

/** @param {Record<string, string | undefined>} env */
export function catalogStorageProvider(env = process.env) {
  const provider = env.CATALOG_STORAGE_PROVIDER ?? "local";
  if (!["local", "supabase"].includes(provider)) throw new Error("Invalid CATALOG_STORAGE_PROVIDER");
  return provider === "supabase" ? "supabase" : "local";
}

/**
 * Resolve a display URL without changing the logical path stored in Saint.
 * Only catalogue paths use the public bucket; local/external images stay intact.
 * @param {string | null | undefined} source
 * @param {"local" | "supabase"} provider
 */
export function resolveCatalogImageUrl(source, provider = "local") {
  if (!source) return catalogImageFallback;
  if (provider !== "supabase" || !source.startsWith("/catalog/")) return source;
  try {
    if (/[?#\\\x00-\x1f\x7f]/.test(source)) return catalogImageFallback;
    const segments = source.slice("/catalog/".length).split("/").map(decodeURIComponent);
    if (segments.some(segment => !segment || segment === "." || segment === ".."
      || /[/\\\x00-\x1f\x7f]|%[0-9a-f]{2}/i.test(segment))) return catalogImageFallback;
    const key = segments.map(encodeURIComponent).join("/");
    return `${catalogStorageOrigin}/storage/v1/object/public/${catalogStorageBucket}/${key}`;
  } catch {
    return catalogImageFallback;
  }
}

/** @param {Record<string, string | undefined>} env */
export function catalogStorageRewrites(env = process.env) {
  if (catalogStorageProvider(env) === "local") return [];
  // Retain logical public URLs for existing links and clients.
  return [{source:"/catalog/:path*",destination:`${catalogStorageOrigin}/storage/v1/object/public/${catalogStorageBucket}/:path*`}];
}
