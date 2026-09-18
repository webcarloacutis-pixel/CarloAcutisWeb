import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { X509Certificate } from "node:crypto";
import type { Socket } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createReadinessCheck, runReadinessDiagnostic } from "./readiness-diagnostics";
import { temporaryTestCertificate } from "./readiness-test-certificate";

let fixture: ReturnType<typeof temporaryTestCertificate>;
beforeAll(() => { fixture = temporaryTestCertificate(); });
afterAll(() => fixture?.cleanup());
function setup() {
  const socket = { destroy: vi.fn() } as unknown as Socket;
  const database = { connect: vi.fn().mockResolvedValue(undefined), readyQuery: vi.fn().mockResolvedValue([{ result: 1 }]), schemaQuery: vi.fn().mockResolvedValue([]) };
  const getDatabase = vi.fn(() => database);
  const dependencies = { resolve: vi.fn().mockResolvedValue([{ address: "192.0.2.1", family: 4 }]),
    tcp: vi.fn().mockResolvedValue(socket), tls: vi.fn().mockResolvedValue({ authorized: true, hostnameVerified: true, protocol: "TLSv1.3" }) };
  const url = new URL("postgresql://acutis_app.rquzpsjismymbyijwhgj:fixture-private-password@fixture.pooler.supabase.com:5432/postgres");
  url.search = new URLSearchParams({ schema: "acutis", sslmode: "require", sslaccept: "strict", sslcert: fixture.certificatePath }).toString();
  const options = { env: { DATABASE_PROVIDER: "supabase", DATABASE_URL: url.toString() }, certificatePath: fixture.certificatePath, expectedFingerprint: fixture.fingerprint, dependencies };
  return { options, database, getDatabase, dependencies, socket, run: () => runReadinessDiagnostic(getDatabase, options) };
}
describe("deterministic readiness stages", () => {
  it("passes a correct certificate, TLS, Prisma query and schema read", async () => {
    const test = setup(); const report = await test.run();
    expect(report).toMatchObject({ ready: true, failureStage: null, fingerprintMatches: true, certificateCurrentlyValid: true,
      dnsResolved: true, tcpConnected: true, tlsConnected: true, tlsAuthorized: true, tlsHostnameVerified: true, prismaReached: true,
      databaseConnected: true, readyQueryPassed: true, schemaAccessible: true });
    expect(test.database.readyQuery).toHaveBeenCalledOnce(); expect(test.database.schemaQuery).toHaveBeenCalledOnce();
    expect(test.socket.destroy).toHaveBeenCalled();
    expect(JSON.stringify(report)).not.toMatch(/fixture-private|fixture\.pooler|acutis_app|192\.0\.2\.1|BEGIN CERTIFICATE/);
  });
  it("reports missing DATABASE_URL before touching networking or Prisma", async () => {
    const test = setup(); test.options.env.DATABASE_URL = "";
    expect(await test.run()).toMatchObject({ failureStage: "ENV_CONFIGURATION", safeCode: "DATABASE_URL_MISSING", databaseUrlDefined: false });
    expect(test.dependencies.resolve).not.toHaveBeenCalled(); expect(test.getDatabase).not.toHaveBeenCalled();
  });
  it("rejects an unsafe TLS setting without logging its value", async () => {
    const test = setup(); const url = new URL(test.options.env.DATABASE_URL);url.searchParams.set("sslaccept", "fixture-secret");test.options.env.DATABASE_URL = url.toString();
    const report = await test.run(); expect(report).toMatchObject({ failureStage: "ENV_CONFIGURATION", sslaccept: "UNRECOGNIZED" });
    expect(JSON.stringify(report)).not.toContain("fixture-secret"); expect(test.dependencies.resolve).not.toHaveBeenCalled();
  });
  it("reports an absent certificate file", async () => {
    const test = setup(); test.options.certificatePath = join(fixture.directory, "missing.crt");
    const url = new URL(test.options.env.DATABASE_URL);url.searchParams.set("sslcert", test.options.certificatePath);test.options.env.DATABASE_URL = url.toString();
    expect(await test.run()).toMatchObject({ failureStage: "CERTIFICATE_FILE", safeCode: "CERT_FILE_NOT_FOUND", certificateExists: false });
    expect(test.getDatabase).not.toHaveBeenCalled();
  });
  it("reports invalid X509 content without printing it", async () => {
    const test = setup(); test.options.certificatePath = join(fixture.directory, "invalid.crt");writeFileSync(test.options.certificatePath, "fixture-private-invalid-pem");
    const url = new URL(test.options.env.DATABASE_URL);url.searchParams.set("sslcert", test.options.certificatePath);test.options.env.DATABASE_URL = url.toString();
    const report = await test.run();expect(report).toMatchObject({ failureStage: "X509_PARSE", safeCode: "CA_PARSE_ERROR", certificateExists: true });
    expect(JSON.stringify(report)).not.toContain("fixture-private"); expect(test.dependencies.resolve).not.toHaveBeenCalled();
  });
  it("accepts matching X509 fingerprints despite different LF/CRLF file hashes", async () => {
    const test = setup(); const original = await test.run();
    test.options.certificatePath = join(fixture.directory, "crlf.crt");
    writeFileSync(test.options.certificatePath, fixture.certificate.toString().replace(/\r?\n/g, "\r\n"));
    const url = new URL(test.options.env.DATABASE_URL);url.searchParams.set("sslcert", test.options.certificatePath);test.options.env.DATABASE_URL = url.toString();
    const changed = await test.run();expect(changed.ready).toBe(true);expect(changed.fingerprintMatches).toBe(true);
    expect(changed.certificateFingerprint256).toBe(original.certificateFingerprint256);
    expect(changed.certificateFileSha256).not.toBe(original.certificateFileSha256);
  });
  it("rejects the reproduced Render case: Base64 body without PEM boundary lines", async () => {
    const test = setup();test.options.certificatePath = join(fixture.directory, "headerless.crt");
    const body = fixture.certificate.toString().split(/\r?\n/).filter(line => !line.startsWith("-----")).join("\n").trim();
    writeFileSync(test.options.certificatePath, body);
    const url = new URL(test.options.env.DATABASE_URL);url.searchParams.set("sslcert", test.options.certificatePath);test.options.env.DATABASE_URL = url.toString();
    expect(await test.run()).toMatchObject({ failureStage: "X509_PARSE", safeCode: "CA_PARSE_ERROR", certificateExists: true, prismaReached: false });
    expect(test.dependencies.resolve).not.toHaveBeenCalled();
  });
  it("stops at a genuinely different X509 fingerprint", async () => {
    const test = setup();test.options.expectedFingerprint = Array(32).fill("00").join(":");
    expect(await test.run()).toMatchObject({ failureStage: "X509_PARSE", safeCode: "CERT_FINGERPRINT_MISMATCH", fingerprintMatches: false });
    expect(test.dependencies.resolve).not.toHaveBeenCalled();
  });
  it("identifies expired certificates before networking", async () => {
    const test = setup(); const now = Date.parse(new X509Certificate(fixture.certificate).validTo) + 1000;
    expect(await runReadinessDiagnostic(test.getDatabase, { ...test.options, now: () => now })).toMatchObject({ failureStage: "X509_PARSE", safeCode: "CERT_EXPIRED" });
  });
  it("reports DNS failure without leaking the resolver error message", async () => {
    const test = setup();test.dependencies.resolve.mockRejectedValue(Object.assign(new Error("fixture-host-secret"), { code: "ENOTFOUND" }));
    const report = await test.run();expect(report).toMatchObject({ failureStage: "DNS_RESOLUTION", safeCode: "ENOTFOUND", dnsResolved: false });
    expect(JSON.stringify(report)).not.toContain("fixture-host");expect(test.dependencies.tcp).not.toHaveBeenCalled();
  });
  it("reports TCP unavailability and never reaches Prisma", async () => {
    const test = setup();test.dependencies.tcp.mockRejectedValue(Object.assign(new Error(), { code: "ECONNREFUSED" }));
    expect(await test.run()).toMatchObject({ failureStage: "TCP_CONNECTION", safeCode: "ECONNREFUSED", tcpConnected: false });
    expect(test.getDatabase).not.toHaveBeenCalled();
  });
  it("distinguishes hostname verification from TLS handshake failure", async () => {
    const test = setup();test.dependencies.tls.mockRejectedValue(Object.assign(new Error("fixture-host-secret"), { code: "ERR_TLS_CERT_ALTNAME_INVALID" }));
    expect(await test.run()).toMatchObject({ failureStage: "TLS_HOSTNAME_VERIFICATION", safeCode: "HOSTNAME_MISMATCH", tlsAuthorized: false, prismaReached: false });
    expect(test.socket.destroy).toHaveBeenCalled();
  });
  it.each([
    ["CERT_HAS_EXPIRED", "CERT_EXPIRED"], ["CERT_NOT_YET_VALID", "CERT_NOT_YET_VALID"],
    ["SELF_SIGNED_CERT_IN_CHAIN", "CERT_UNTRUSTED"], ["ERR_OSSL_PEM_NO_START_LINE", "CA_PARSE_ERROR"],
    ["ERR_SSL_WRONG_VERSION_NUMBER", "TLS_PROTOCOL_ERROR"], ["fixture-secret-code", "UNKNOWN_TLS_ERROR"],
  ])("safely classifies TLS error %s", async (code, safeCode) => {
    const test = setup();test.dependencies.tls.mockRejectedValue(Object.assign(new Error("fixture-secret-message"), { code }));
    const report = await test.run();expect(report).toMatchObject({ failureStage: "TLS_HANDSHAKE", safeCode, prismaReached: false });
    expect(JSON.stringify(report)).not.toMatch(/fixture-secret/);
  });
  it("classifies a simulated rejected password after successful TLS", async () => {
    const test = setup();test.database.connect.mockRejectedValue({ name: "PrismaClientInitializationError", errorCode: "P1000", message: "fixture-secret" });
    expect(await test.run()).toMatchObject({ failureStage: "DATABASE_AUTHENTICATION", prismaCode: "P1000", tlsAuthorized: true, fingerprintMatches: true });
    expect(test.database.readyQuery).not.toHaveBeenCalled();
  });
  it("does not relabel a Prisma-specific TLS failure as the Node TLS stage", async () => {
    const test = setup();test.database.connect.mockRejectedValue({ name: "PrismaClientInitializationError", message: "Error opening a TLS connection; fixture-secret" });
    expect(await test.run()).toMatchObject({ failureStage: "PRISMA_INITIALIZATION", safeCode: "PRISMA_TLS_ERROR", tlsAuthorized: true, prismaReached: true });
  });
  it("classifies a database connection failure separately", async () => {
    const test = setup();test.database.connect.mockRejectedValue({ code: "P1001", message: "fixture-secret" });
    expect(await test.run()).toMatchObject({ failureStage: "DATABASE_CONNECTION", prismaCode: "P1001", tlsAuthorized: true });
  });
  it("classifies schema access failure and retains only PostgreSQL SQLSTATE", async () => {
    const test = setup();test.database.schemaQuery.mockRejectedValue({ code: "P2010", meta: { code: "42501", message: "fixture-secret" } });
    const report = await test.run();expect(report).toMatchObject({ failureStage: "SCHEMA_ACCESS", postgresCode: "42501", schemaAccessible: false, readyQueryPassed: true });
    expect(JSON.stringify(report)).not.toContain("fixture-secret");
  });
  it("classifies a readiness query failure", async () => {
    const test = setup();test.database.readyQuery.mockRejectedValue(new Error("fixture-secret"));
    expect(await test.run()).toMatchObject({ failureStage: "READY_QUERY", safeCode: "READY_QUERY_FAILED" });
    expect(test.database.schemaQuery).not.toHaveBeenCalled();
  });
  it("coalesces probes and emits one safe object without duplicate generic logs", async () => {
    const test = setup();const log = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const check = createReadinessCheck(test.getDatabase, test.options);
      const [first, second] = await Promise.all([check(), check()]);expect(first).toBe(second);
      expect(await check()).toBe(first);expect(test.dependencies.resolve).toHaveBeenCalledOnce();
      expect(log).toHaveBeenCalledExactlyOnceWith("DB_READINESS_DIAGNOSTIC", first);
    } finally { log.mockRestore(); }
  });
});


describe("explicit local readiness without weakening Supabase checks", () => {
  const localUrl = "postgresql://synthetic:synthetic@127.0.0.1:55439/acutis_catalog_capacity_test";
  it("checks the local Prisma connection and schema without requiring Supabase TLS", async () => {
    const test = setup(); test.options.env.DATABASE_PROVIDER = "local"; test.options.env.DATABASE_URL = localUrl;
    const result = await test.run();
    expect(result).toMatchObject({ ready: true, databaseConnected: true, readyQueryPassed: true, schemaAccessible: true,
      certificateExists: false, tlsConnected: false, tlsAuthorized: false, certificateFingerprint256: null });
    expect(test.database.connect).toHaveBeenCalledOnce(); expect(test.database.readyQuery).toHaveBeenCalledOnce();
    expect(test.database.schemaQuery).toHaveBeenCalledOnce();
    expect(test.dependencies.resolve).not.toHaveBeenCalled(); expect(test.dependencies.tls).not.toHaveBeenCalled();
  });
  it.each(["postgresql://synthetic:synthetic@remote.invalid:5432/postgres", "file:///local-only"])("rejects an invalid local target without networking: %s", async value => {
    const test = setup(); test.options.env.DATABASE_PROVIDER = "local"; test.options.env.DATABASE_URL = value;
    expect(await test.run()).toMatchObject({ ready: false, failureStage: "ENV_CONFIGURATION", safeCode: "DATABASE_LOCAL_TARGET_INVALID" });
    expect(test.getDatabase).not.toHaveBeenCalled(); expect(test.dependencies.resolve).not.toHaveBeenCalled();
  });
  it("reports a rejected local database connection without exposing credentials or endpoint", async () => {
    const test = setup(); test.options.env.DATABASE_PROVIDER = "local"; test.options.env.DATABASE_URL = localUrl.replace(":55439/", ":9/");
    test.database.connect.mockRejectedValue({ code: "P1001", message: localUrl });
    const report = await test.run();
    expect(report).toMatchObject({ ready: false, failureStage: "DATABASE_CONNECTION", safeCode: "P1001", prismaReached: true });
    expect(JSON.stringify(report)).not.toMatch(/synthetic|127\.0\.0\.1|postgresql/);
    expect(test.database.readyQuery).not.toHaveBeenCalled();
  });
  it("refreshes a cached failure after five seconds and then reports recovery", async () => {
    const test = setup(); test.options.env.DATABASE_PROVIDER = "local"; test.options.env.DATABASE_URL = localUrl;
    test.database.connect.mockRejectedValueOnce({ code: "P1001" });
    const time = vi.spyOn(Date, "now").mockReturnValue(0), log = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const check = createReadinessCheck(test.getDatabase, test.options);
      expect((await check()).ready).toBe(false); expect((await check()).ready).toBe(false);
      expect(test.database.connect).toHaveBeenCalledOnce();
      time.mockReturnValue(5001);
      expect((await check()).ready).toBe(true); expect(test.database.connect).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenCalledTimes(2);
    } finally { time.mockRestore(); log.mockRestore(); }
  });
});
