import { CATALOG_CAPACITY } from "./catalog-limits";
import { safeErrorDiagnostics } from "./error-diagnostics";
import type { ErrorRequestHandler } from "express";
export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (res.headersSent) return;
  if (error instanceof HttpError) { res.locals.aiCode = error.code; res.status(error.status).json({ error: error.code,
    ...(["SAINT_LIMIT_REACHED", "MIRACLE_LIMIT_REACHED"].includes(error.code) ? { limit: CATALOG_CAPACITY, message: `Se alcanzó el límite de ${CATALOG_CAPACITY} ${error.code === "SAINT_LIMIT_REACHED" ? "santos" : "milagros"}. No se pueden crear más registros.` } : {}),
    ...(res.locals.requestId ? {requestId: res.locals.requestId} : {}) }); return; }
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
  if (code === "P2002") { res.status(409).json({ error: "ALREADY_EXISTS" }); return; }
  if (code === "P2025") { res.status(404).json({ error: "NOT_FOUND" }); return; }
  if (code === "P2003") { res.status(400).json({ error: "INVALID_REFERENCE" }); return; }
  if (status === 413) { res.status(413).json({ error: "BODY_TOO_LARGE" }); return; }
  if (error instanceof SyntaxError && status === 400) { res.status(400).json({ error: "INVALID_JSON" }); return; }
  // Never log request bodies, cookies, provider errors, SQL or stack traces.
  const safeCode = /^P\d{4}$/.test(code) || /^(?:\d{2}|F0|HV|P0|XX)[A-Z0-9]{3}$/.test(code) ? code : null;
  console.error("REQUEST_FAILED", { ...safeErrorDiagnostics(), code: safeCode, requestId: res.locals?.requestId ?? null });
  res.status(500).json({ error: "INTERNAL_ERROR" });
};
