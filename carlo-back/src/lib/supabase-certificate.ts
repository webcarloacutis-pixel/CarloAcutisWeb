import { resolve } from "node:path";

// npm start/build/test run from carlo-back, including Render's Root Directory.
// This public CA ships with the application; no Render Secret File is needed.
export const supabaseCertificatePath = resolve(process.cwd(), "certs", "supabase-prod-ca-2021.crt");
export const supabaseCertificateFingerprint256 = "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";

export function databaseUrlWithVersionedCa(databaseUrl: string, provider = process.env.DATABASE_PROVIDER) {
  if (provider !== "supabase") return databaseUrl;
  const url = new URL(databaseUrl);
  // Preserve endpoint, identity, password, schema and strict TLS options.
  url.searchParams.set("sslcert", supabaseCertificatePath);
  return url.toString();
}
