import { createHash, X509Certificate } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import type { Socket } from "node:net";
import { validateSupabaseRuntime } from "./supabase-config";
import { resolveDatabaseHost, connectDatabaseTcp, probePostgresTls } from "./readiness-transport";

export const expectedCertificatePath = "/etc/secrets/supabase-prod-ca-2021.crt";
// Fingerprint of the verified X509 DER certificate, not the PEM file's SHA-256.
export const expectedCertificateFingerprint256 = "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";
export type ReadinessStage = "ENV_CONFIGURATION" | "CERTIFICATE_FILE" | "X509_PARSE" | "DNS_RESOLUTION" |
  "TCP_CONNECTION" | "TLS_HANDSHAKE" | "TLS_HOSTNAME_VERIFICATION" | "PRISMA_INITIALIZATION" |
  "DATABASE_AUTHENTICATION" | "DATABASE_CONNECTION" | "SCHEMA_ACCESS" | "READY_QUERY";
export interface ReadinessDatabase {
  connect(): Promise<unknown>;
  readyQuery(): Promise<unknown>;
  schemaQuery(): Promise<unknown>;
}
const defaultDependencies = { resolve: resolveDatabaseHost, tcp: connectDatabaseTcp, tls: probePostgresTls };
export interface ReadinessOptions {
  env?: NodeJS.ProcessEnv;
  certificatePath?: string;
  expectedFingerprint?: string;
  now?: () => number;
  dependencies?: Partial<typeof defaultDependencies>;
}
class DiagnosticFailure extends Error {
  constructor(readonly stage: ReadinessStage, readonly safeCode: string) { super("Readiness diagnostic failed"); }
}
function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}
function codeOf(error: unknown) { return typeof record(error).code === "string" ? record(error).code as string : ""; }
const nodeCodes = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENETUNREACH", "EHOSTUNREACH", "EACCES", "EPERM", "ENOENT", "EISDIR"]);
function tlsCategory(error: unknown) {
  const code = codeOf(error);
  if (code === "ERR_TLS_CERT_ALTNAME_INVALID") return "HOSTNAME_MISMATCH";
  if (code === "CERT_HAS_EXPIRED") return "CERT_EXPIRED";
  if (code === "CERT_NOT_YET_VALID") return "CERT_NOT_YET_VALID";
  if (["DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "CERT_UNTRUSTED", "TLS_UNAUTHORIZED"].includes(code)) return "CERT_UNTRUSTED";
  if (["ERR_OSSL_PEM_NO_START_LINE", "ERR_OSSL_PEM_BAD_BASE64_DECODE", "ERR_OSSL_ASN1_HEADER_TOO_LONG", "ERR_OSSL_ASN1_WRONG_TAG"].includes(code)) return "CA_PARSE_ERROR";
  if (code === "POSTGRES_SSL_REFUSED" || /^ERR_SSL_[A-Z0-9_]+$/.test(code)) return "TLS_PROTOCOL_ERROR";
  return "UNKNOWN_TLS_ERROR";
}
function safeOption(params: URLSearchParams, key: string, allowed: string[]) {
  const values = params.getAll(key);
  return !values.length ? null : values.length > 1 ? "AMBIGUOUS" : allowed.includes(values[0]) ? values[0] : "UNRECOGNIZED";
}
async function bounded<T>(promise: Promise<T>, milliseconds: number, stage: ReadinessStage): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new DiagnosticFailure(stage, "ETIMEDOUT")), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

export async function runReadinessDiagnostic(getDatabase: () => ReadinessDatabase, options: ReadinessOptions = {}) {
  const env = options.env ?? process.env;
  const path = options.certificatePath ?? expectedCertificatePath;
  const expectedFingerprint = options.expectedFingerprint ?? expectedCertificateFingerprint256;
  const deps = { ...defaultDependencies, ...options.dependencies };
  const report = {
    ready: false, failureStage: null as ReadinessStage | null, safeCode: null as string | null,
    prismaCode: null as string | null, postgresCode: null as string | null,
    databaseUrlDefined: Boolean(env.DATABASE_URL), protocolIsPostgresql: false,
    sslmode: null as string | null, sslaccept: null as string | null,
    sslcertConfigured: false, sslcertMatchesExpectedPath: false, schemaConfigured: false, portConfigured: false,
    hostDefined: false, userDefined: false, passwordDefined: false,
    certificateExists: false, certificateBytes: null as number | null, certificateFileSha256: null as string | null,
    certificateFingerprint256: null as string | null, expectedCertificateFingerprint256: null as string | null,
    fingerprintMatches: false, validFrom: null as string | null, validTo: null as string | null, certificateCurrentlyValid: false,
    dnsResolved: false, addressCount: 0, ipv4Count: 0, ipv6Count: 0, tcpConnected: false, timeout: false,
    tlsConnected: false, tlsAuthorized: false, authorizationErrorCategory: null as string | null,
    protocol: null as string | null, tlsHostnameVerified: false,
    prismaReached: false, databaseConnected: false, readyQueryPassed: false, schemaAccessible: false,
  };
  let stage: ReadinessStage = "ENV_CONFIGURATION";
  let socket: Socket | undefined;
  try {
    if (!report.databaseUrlDefined) throw new DiagnosticFailure(stage, "DATABASE_URL_MISSING");
    let url: URL;
    try { url = new URL(env.DATABASE_URL!); } catch { throw new DiagnosticFailure(stage, "DATABASE_URL_INVALID"); }
    const params = url.searchParams;
    report.protocolIsPostgresql = ["postgres:", "postgresql:"].includes(url.protocol);
    report.hostDefined = Boolean(url.hostname);
    report.userDefined = Boolean(url.username);
    report.passwordDefined = Boolean(url.password);
    report.portConfigured = Boolean(url.port);
    report.schemaConfigured = Boolean(params.get("schema"));
    report.sslmode = safeOption(params, "sslmode", ["disable", "allow", "prefer", "require", "verify-ca", "verify-full"]);
    report.sslaccept = safeOption(params, "sslaccept", ["strict", "accept_invalid_certs"]);
    report.sslcertConfigured = params.getAll("sslcert").some(Boolean);
    report.sslcertMatchesExpectedPath = params.getAll("sslcert").length === 1 && params.get("sslcert") === path;
    if (!/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(expectedFingerprint)) throw new DiagnosticFailure(stage, "EXPECTED_FINGERPRINT_INVALID");
    report.expectedCertificateFingerprint256 = expectedFingerprint;
    if (!report.passwordDefined || !report.sslcertMatchesExpectedPath || report.sslmode !== "require" || report.sslaccept !== "strict") {
      throw new DiagnosticFailure(stage, "DATABASE_TLS_CONFIGURATION_INVALID");
    }
    try { validateSupabaseRuntime({ ...env, DATABASE_PROVIDER: "supabase" }); }
    catch { throw new DiagnosticFailure(stage, "DATABASE_TARGET_CONFIGURATION_INVALID"); }

    stage = "CERTIFICATE_FILE";
    report.certificateExists = existsSync(path);
    if (!report.certificateExists) throw new DiagnosticFailure(stage, "CERT_FILE_NOT_FOUND");
    const size = statSync(path).size;
    report.certificateBytes = size;
    if (size > 1024 * 1024) throw new DiagnosticFailure(stage, "CERT_FILE_TOO_LARGE");
    const bytes = readFileSync(path);
    report.certificateBytes = bytes.length;
    report.certificateFileSha256 = createHash("sha256").update(bytes).digest("hex");
    stage = "X509_PARSE";
    let certificate: X509Certificate;
    try { certificate = new X509Certificate(bytes); }
    catch { throw new DiagnosticFailure(stage, "CA_PARSE_ERROR"); }
    report.certificateFingerprint256 = certificate.fingerprint256;
    report.fingerprintMatches = certificate.fingerprint256 === expectedFingerprint;
    const from = Date.parse(certificate.validFrom), to = Date.parse(certificate.validTo);
    report.validFrom = new Date(from).toISOString();
    report.validTo = new Date(to).toISOString();
    const now = (options.now ?? Date.now)();
    report.certificateCurrentlyValid = now >= from && now <= to;
    if (!report.fingerprintMatches) throw new DiagnosticFailure(stage, "CERT_FINGERPRINT_MISMATCH");
    if (!report.certificateCurrentlyValid) throw new DiagnosticFailure(stage, now < from ? "CERT_NOT_YET_VALID" : "CERT_EXPIRED");

    stage = "DNS_RESOLUTION";
    const addresses = await bounded(deps.resolve(url.hostname), 3000, stage);
    report.addressCount = addresses.length;
    report.ipv4Count = addresses.filter(address => address.family === 4).length;
    report.ipv6Count = addresses.filter(address => address.family === 6).length;
    report.dnsResolved = addresses.length > 0;
    if (!report.dnsResolved) throw new DiagnosticFailure(stage, "DNS_NO_ADDRESSES");
    stage = "TCP_CONNECTION";
    socket = await deps.tcp(url.hostname, Number(url.port), 5000);
    report.tcpConnected = true;
    stage = "TLS_HANDSHAKE";
    const tls = await deps.tls(socket, url.hostname, bytes, 7000);
    report.tlsConnected = true;
    report.tlsAuthorized = tls.authorized;
    report.protocol = ["TLSv1.2", "TLSv1.3"].includes(tls.protocol ?? "") ? tls.protocol : null;
    if (!tls.authorized) throw new DiagnosticFailure(stage, "CERT_UNTRUSTED");
    stage = "TLS_HOSTNAME_VERIFICATION";
    report.tlsHostnameVerified = tls.hostnameVerified;
    if (!tls.hostnameVerified) throw new DiagnosticFailure(stage, "HOSTNAME_MISMATCH");

    stage = "PRISMA_INITIALIZATION";
    report.prismaReached = true;
    const database = getDatabase();
    stage = "DATABASE_CONNECTION";
    await bounded(database.connect(), 10000, stage);
    report.databaseConnected = true;
    stage = "READY_QUERY";
    await bounded(database.readyQuery(), 2000, stage);
    report.readyQueryPassed = true;
    stage = "SCHEMA_ACCESS";
    await bounded(database.schemaQuery(), 2000, stage);
    report.schemaAccessible = true;
    report.ready = true;
  } catch (error) {
    report.failureStage = stage;
    if (error instanceof DiagnosticFailure) {
      report.failureStage = error.stage;
      report.safeCode = error.safeCode;
    } else if (stage === "TLS_HANDSHAKE" || stage === "TLS_HOSTNAME_VERIFICATION") {
      const category = tlsCategory(error);
      report.authorizationErrorCategory = category;
      report.safeCode = category;
      if (category === "HOSTNAME_MISMATCH") report.failureStage = "TLS_HOSTNAME_VERIFICATION";
    } else if (report.prismaReached) {
      const item = record(error), meta = record(item.meta), cause = record(item.cause);
      const values = [item.code, item.errorCode, meta.code, cause.code];
      report.prismaCode = values.find((value): value is string => typeof value === "string" && /^P\d{4}$/.test(value)) ?? null;
      report.postgresCode = values.find((value): value is string => typeof value === "string" && /^(?:\d{2}[A-Z0-9]{3}|(?:F0|HV|P0|XX)[A-Z0-9]{3})$/.test(value)) ?? null;
      const message = typeof item.message === "string" ? item.message : "";
      if (report.prismaCode === "P1000" || report.postgresCode?.startsWith("28") || /authentication failed|password authentication|credentials.*not valid/i.test(message)) {
        report.failureStage = "DATABASE_AUTHENTICATION";
        report.safeCode = "AUTHENTICATION_REJECTED";
      } else if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(report.prismaCode ?? "") || report.postgresCode?.startsWith("08")) {
        report.failureStage = "DATABASE_CONNECTION";
        report.safeCode = "DATABASE_CONNECTION_FAILED";
      } else if (stage !== "SCHEMA_ACCESS" && (item.name === "PrismaClientInitializationError" || report.prismaCode === "P1011")) {
        report.failureStage = "PRISMA_INITIALIZATION";
        report.safeCode = /certificate|\bTLS\b|\bSSL\b/i.test(message) || report.prismaCode === "P1011" ? "PRISMA_TLS_ERROR" : "PRISMA_INITIALIZATION_FAILED";
      } else report.safeCode = stage === "SCHEMA_ACCESS" ? "SCHEMA_READ_FAILED" : stage === "READY_QUERY" ? "READY_QUERY_FAILED" : "PRISMA_INITIALIZATION_FAILED";
      report.safeCode = report.prismaCode ?? report.postgresCode ?? report.safeCode;
    } else report.safeCode = nodeCodes.has(codeOf(error)) ? codeOf(error) : stage === "CERTIFICATE_FILE" ? "CERT_FILE_UNREADABLE" : stage === "DNS_RESOLUTION" ? "DNS_FAILED" : stage === "TCP_CONNECTION" ? "TCP_FAILED" : "DIAGNOSTIC_FAILED";
    report.timeout = report.safeCode === "ETIMEDOUT" || codeOf(error) === "ETIMEDOUT";
  } finally { socket?.destroy(); }
  return report;
}

// Coalesce concurrent health checks and cache briefly; probes never share request input.
export function createReadinessCheck(getDatabase: () => ReadinessDatabase, options: ReadinessOptions = {}) {
  let inFlight: Promise<Awaited<ReturnType<typeof runReadinessDiagnostic>>> | undefined;
  let cached: Awaited<ReturnType<typeof runReadinessDiagnostic>> | undefined;
  let until = 0;
  return () => {
    if (inFlight) return inFlight;
    if (cached && Date.now() < until) return Promise.resolve(cached);
    inFlight = runReadinessDiagnostic(getDatabase, options).then(report => {
      cached = report; until = Date.now() + 5000;
      console.info("DB_READINESS_DIAGNOSTIC", report);
      return report;
    }).finally(() => { inFlight = undefined; });
    return inFlight;
  };
}
