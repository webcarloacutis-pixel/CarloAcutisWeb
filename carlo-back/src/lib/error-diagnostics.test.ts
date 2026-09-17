import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { safeErrorDiagnostics } from "./error-diagnostics";
import { errorHandler } from "./errors";

vi.mock("node:fs", () => ({ existsSync: vi.fn() }));
const secret = "fixture-private-value-do-not-log";

describe("safe database error diagnostics", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.stubEnv("DATABASE_URL", `postgresql://fixture-user:${secret}@fixture-host/postgres`);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.mocked(existsSync).mockReset(); });

  it("reports initialization errorCode without exposing messages, URL or certificate contents", () => {
    const result = safeErrorDiagnostics({ name: "PrismaClientInitializationError", errorCode: "P1011", message: secret, stack: secret, certificate: secret });
    expect(result).toEqual({ code: "P1011", category: "DATABASE_TLS", certificateExists: true, databaseUrlDefined: true });
    expect(existsSync).toHaveBeenCalledWith("/etc/secrets/supabase-prod-ca-2021.crt");
    expect(JSON.stringify(result)).not.toMatch(/fixture|postgresql|BEGIN CERTIFICATE/);
  });
  it("classifies authentication when Prisma initialization omits both code fields", () => {
    expect(safeErrorDiagnostics({ name: "PrismaClientInitializationError", message: `Authentication failed; credentials ${secret} not valid` })).toMatchObject({ code: null, category: "DATABASE_AUTHENTICATION" });
  });
  it("extracts PostgreSQL SQLSTATE from raw-query metadata", () => {
    expect(safeErrorDiagnostics({ code: "P2010", meta: { code: "42501", message: secret } })).toMatchObject({ code: "42501", category: "DATABASE_PERMISSION" });
  });
  it.each([
    ["P1001", "DATABASE_CONNECTION"], ["28P01", "DATABASE_AUTHENTICATION"],
    ["42P01", "DATABASE_SCHEMA"], ["P2028", "DATABASE"],
  ])("classifies %s using fixed labels", (code, category) => {
    expect(safeErrorDiagnostics({ code })).toMatchObject({ code, category });
  });
  it("does not serialize arbitrary codes or error objects", () => {
    const unsafe = { code: secret, errorCode: { toString() { throw new Error("Do not stringify"); } }, message: secret, stack: secret, cause: { code: secret } };
    expect(safeErrorDiagnostics(unsafe)).toEqual({ code: null, category: "INTERNAL", certificateExists: true, databaseUrlDefined: true });
  });
  it("reports missing configuration and missing certificate as booleans", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    vi.mocked(existsSync).mockReturnValue(false);
    expect(safeErrorDiagnostics(null)).toEqual({ code: null, category: "INTERNAL", certificateExists: false, databaseUrlDefined: false });
  });
  it("keeps filesystem errors out of the log", () => {
    vi.mocked(existsSync).mockImplementation(() => { throw new Error(secret); });
    expect(safeErrorDiagnostics({ name: "PrismaClientInitializationError" })).toEqual({ code: null, category: "DATABASE_INITIALIZATION", certificateExists: false, databaseUrlDefined: true });
  });
  it("logs exactly four safe fields and leaves the public response generic", () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
    errorHandler({ name: "PrismaClientInitializationError", errorCode: "P1000", message: secret }, {} as Request, res as unknown as Response, vi.fn() as NextFunction);
    expect(logger).toHaveBeenCalledExactlyOnceWith("REQUEST_FAILED", { code: "P1000", category: "DATABASE_AUTHENTICATION", certificateExists: true, databaseUrlDefined: true });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_ERROR" });
  });
});
