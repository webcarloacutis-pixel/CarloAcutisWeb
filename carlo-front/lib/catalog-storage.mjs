export const catalogStorageOrigin = "https://rquzpsjismymbyijwhgj.supabase.co";
export const catalogStorageBucket = "acutis-catalog";
/** @param {Record<string, string | undefined>} env */
export function catalogStorageRewrites(env = process.env) {
  const provider = env.CATALOG_STORAGE_PROVIDER ?? "local";
  if (!["local", "supabase"].includes(provider)) throw new Error("Invalid CATALOG_STORAGE_PROVIDER");
  if (provider === "local") return [];
  // beforeFiles prevents silently serving the bundled local copy on remote failure.
  return [{source:"/catalog/:path*",destination:`${catalogStorageOrigin}/storage/v1/object/public/${catalogStorageBucket}/:path*`}];
}
