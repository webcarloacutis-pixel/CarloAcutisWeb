import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { safeErrorDiagnostics } from "./error-diagnostics";
import { errorHandler } from "./errors";

vi.mock("node:fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));
import { supabaseCertificatePath as certificatePath } from "./supabase-certificate";
const secret = "fixture-private-do-not-log";
const certificate = Buffer.from(`fixture certificate bytes ${secret}\r\n`, "utf8");
const hash = createHash("sha256").update(certificate).digest("hex");
function url(params: string) { return `postgresql://fixture-user:${secret}@fixture-host/postgres?${params}`; }
const options = `sslmode=require&sslaccept=strict&sslcert=${encodeURIComponent(certificatePath)}`;
const expected = { certificateSha256: hash, certificateBytes: certificate.byteLength, certificateExists: true,
  sslmode: "require", sslaccept: "strict", sslcertConfigured: true, sslcertMatchesExpectedPath: true, databaseUrlDefined: true };

describe("safe TLS file diagnostics", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(certificate);
    vi.stubEnv("DATABASE_URL", url(options));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.mocked(existsSync).mockReset(); vi.mocked(readFileSync).mockReset(); });

  it("hashes exact file bytes and returns only the eight authorized fields", () => {
    expect(safeErrorDiagnostics()).toEqual(expected);
    expect(existsSync).toHaveBeenCalledWith(certificatePath);
    expect(readFileSync).toHaveBeenCalledWith(certificatePath);
    expect(JSON.stringify(safeErrorDiagnostics())).not.toMatch(/fixture|postgresql|\/etc\/secrets/);
  });
  it("detects changed bytes without normalizing line endings or exposing contents", () => {
    const changed = Buffer.from(certificate.toString().replace("\r\n", "\n"));
    vi.mocked(readFileSync).mockReturnValue(changed);
    expect(safeErrorDiagnostics()).toMatchObject({ certificateSha256: createHash("sha256").update(changed).digest("hex"), certificateBytes: changed.length });
    expect(safeErrorDiagnostics().certificateSha256).not.toBe(hash);
  });
  it("handles missing files and absent DATABASE_URL", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.stubEnv("DATABASE_URL", undefined);
    expect(safeErrorDiagnostics()).toEqual({ certificateSha256: null, certificateBytes: null, certificateExists: false,
      sslmode: null, sslaccept: null, sslcertConfigured: false, sslcertMatchesExpectedPath: false, databaseUrlDefined: false });
    expect(readFileSync).not.toHaveBeenCalled();
  });
  it("does not confuse existence with readability", () => {
    vi.mocked(readFileSync).mockImplementation(() => { throw new Error(secret); });
    expect(safeErrorDiagnostics()).toEqual({ ...expected, certificateSha256: null, certificateBytes: null });
  });
  it("suppresses filesystem lookup errors", () => {
    vi.mocked(existsSync).mockImplementation(() => { throw new Error(secret); });
    expect(safeErrorDiagnostics()).toEqual({ ...expected, certificateSha256: null, certificateBytes: null, certificateExists: false });
  });
  it("redacts malformed URLs", () => {
    vi.stubEnv("DATABASE_URL", secret);
    expect(safeErrorDiagnostics()).toEqual({ ...expected, sslmode: "INVALID_URL", sslaccept: "INVALID_URL", sslcertConfigured: false, sslcertMatchesExpectedPath: false });
  });
  it("redacts arbitrary values in TLS parameters", () => {
    vi.stubEnv("DATABASE_URL", url(`sslmode=${secret}&sslaccept=${secret}&sslcert=${secret}`));
    expect(safeErrorDiagnostics()).toEqual({ ...expected, sslmode: "UNRECOGNIZED", sslaccept: "UNRECOGNIZED", sslcertMatchesExpectedPath: false });
  });
  it("marks duplicate parameters ambiguous without printing their values", () => {
    vi.stubEnv("DATABASE_URL", url(`${options}&sslmode=${secret}&sslaccept=${secret}&sslcert=${secret}`));
    expect(safeErrorDiagnostics()).toEqual({ ...expected, sslmode: "AMBIGUOUS", sslaccept: "AMBIGUOUS", sslcertMatchesExpectedPath: false });
  });
  it.each(["", "sslrootcert=fixture-path", "sslcert="])("does not treat %s as a configured sslcert", query => {
    vi.stubEnv("DATABASE_URL", url(query));
    expect(safeErrorDiagnostics()).toMatchObject({ sslcertConfigured: false, sslcertMatchesExpectedPath: false });
  });
  it.each(["/etc/secrets/wrong.crt", `${certificatePath} `, "/etc/secrets/../secrets/supabase-prod-ca-2021.crt"])("requires the exact CA path: %s", path => {
    vi.stubEnv("DATABASE_URL", url(`sslcert=${encodeURIComponent(path)}`));
    expect(safeErrorDiagnostics()).toMatchObject({ sslcertConfigured: true, sslcertMatchesExpectedPath: false });
  });
  it("logs only safe metadata and keeps the public response generic", () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
    errorHandler({ name: "PrismaClientInitializationError", message: secret, stack: secret }, {} as Request, res as unknown as Response, vi.fn() as NextFunction);
    expect(logger).toHaveBeenCalledExactlyOnceWith("REQUEST_FAILED", expected);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_ERROR" });
  });
});
