// Prisma 6 uses sslmode=require plus sslaccept=strict for verified TLS.
export const supabaseProjectRef = "rquzpsjismymbyijwhgj";
export function validateSupabaseRuntime(env: NodeJS.ProcessEnv = process.env) {
  if (env.DATABASE_PROVIDER !== "supabase") return;
  if (env.DIRECT_URL || env.SUPABASE_SECRET_KEY || env.SUPABASE_ACCESS_TOKEN) {
    throw new Error("Maintenance credentials must not be loaded in the API runtime");
  }
  let url: URL;
  try { url = new URL(env.DATABASE_URL ?? ""); }
  catch { throw new Error("Invalid Supabase runtime database configuration"); }
  for (const key of ["schema", "sslmode", "sslaccept"]) {
    if (url.searchParams.getAll(key).length !== 1) throw new Error("Ambiguous Supabase connection option");
  }
  const user = decodeURIComponent(url.username);
  const direct = url.hostname === `db.${supabaseProjectRef}.supabase.co`;
  const pooled = url.hostname.endsWith(".pooler.supabase.com") && user === `acutis_app.${supabaseProjectRef}`;
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !(direct || pooled) ||
      user !== (pooled ? `acutis_app.${supabaseProjectRef}` : "acutis_app") ||
      url.port !== "5432" || url.pathname !== "/postgres" ||
      url.searchParams.get("schema") !== "acutis" ||
      url.searchParams.get("sslmode") !== "require" || url.searchParams.get("sslaccept") !== "strict") {
    throw new Error("Supabase requires the authorized project, acutis schema, acutis_app role, session port and verified TLS");
  }
}
