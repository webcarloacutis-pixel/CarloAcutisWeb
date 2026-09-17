import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const certificatePath = "/etc/secrets/supabase-prod-ca-2021.crt";

function safeParameter(params: URLSearchParams, key: string, allowed: readonly string[]) {
  const values = params.getAll(key);
  if (values.length === 0) return null;
  if (values.length !== 1) return "AMBIGUOUS";
  return allowed.includes(values[0]) ? values[0] : "UNRECOGNIZED";
}

// Exactly eight fields. Never expose the URL, error text, certificate bytes or paths.
export function safeErrorDiagnostics() {
  let certificateExists = false;
  let certificateSha256: string | null = null;
  let certificateBytes: number | null = null;
  try {
    certificateExists = existsSync(certificatePath);
    if (certificateExists) {
      const bytes = readFileSync(certificatePath);
      certificateSha256 = createHash("sha256").update(bytes).digest("hex");
      certificateBytes = bytes.byteLength;
    }
  } catch { /* Unreadable files remain null; never log filesystem errors. */ }

  const databaseUrlDefined = Boolean(process.env.DATABASE_URL);
  let sslmode: string | null = null;
  let sslaccept: string | null = null;
  let sslcertConfigured = false;
  let sslcertMatchesExpectedPath = false;
  if (databaseUrlDefined) {
    try {
      const params = new URL(process.env.DATABASE_URL!).searchParams;
      // Allowlist values so secrets accidentally pasted into options cannot be logged.
      sslmode = safeParameter(params, "sslmode", ["disable", "allow", "prefer", "require", "verify-ca", "verify-full"]);
      sslaccept = safeParameter(params, "sslaccept", ["strict", "accept_invalid_certs"]);
      const certs = params.getAll("sslcert");
      sslcertConfigured = certs.some(value => value.length > 0);
      sslcertMatchesExpectedPath = certs.length === 1 && certs[0] === certificatePath;
    } catch {
      sslmode = "INVALID_URL";
      sslaccept = "INVALID_URL";
    }
  }
  return { certificateSha256, certificateBytes, certificateExists, sslmode, sslaccept,
    sslcertConfigured, sslcertMatchesExpectedPath, databaseUrlDefined };
}
