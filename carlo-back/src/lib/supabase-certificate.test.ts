import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseUrlWithPool } from "./database-config";
import { databaseUrlWithVersionedCa, supabaseCertificatePath, supabaseCertificateFingerprint256 } from "./supabase-certificate";

afterEach(() => vi.unstubAllEnvs());
describe("versioned public Supabase CA", () => {
  it("ships a complete PEM with the independently pinned X509 fingerprint", () => {
    const pem = readFileSync(supabaseCertificatePath, "utf8");
    expect(pem.startsWith("-----BEGIN CERTIFICATE-----\n")).toBe(true);
    expect(pem.trimEnd().endsWith("-----END CERTIFICATE-----")).toBe(true);
    const certificate = new X509Certificate(pem);
    expect(certificate.fingerprint256).toBe("80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA");
    expect(certificate.fingerprint256).toBe(supabaseCertificateFingerprint256);
    expect(certificate.ca).toBe(true);
  });
  it("replaces only sslcert and preserves the existing connection and strict TLS", () => {
    const original = new URL("postgresql://fixture:encoded%40password@fixture.invalid:5432/postgres?schema=acutis&sslmode=require&sslaccept=strict&sslcert=%2Fetc%2Fsecrets%2Fsupabase-prod-ca-2021.crt");
    const updated = new URL(databaseUrlWithVersionedCa(original.toString(), "supabase"));
    expect(updated.searchParams.getAll("sslcert")).toEqual([supabaseCertificatePath]);
    original.searchParams.delete("sslcert");updated.searchParams.delete("sslcert");
    expect(updated.toString()).toBe(original.toString());
  });
  it("uses the versioned CA in the actual Prisma pool configuration", () => {
    vi.stubEnv("DATABASE_PROVIDER", "supabase");
    const url = new URL(databaseUrlWithPool("postgresql://fixture:fixture@fixture.invalid:5432/postgres?schema=acutis&sslmode=require&sslaccept=strict", "5"));
    expect(url.searchParams.get("sslcert")).toBe(supabaseCertificatePath);
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.searchParams.get("sslaccept")).toBe("strict");
  });
  it("does not rewrite a non-Supabase connection", () => {
    const url = "postgresql://fixture:fixture@127.0.0.1:5432/local";
    expect(databaseUrlWithVersionedCa(url, "local")).toBe(url);
  });
});
