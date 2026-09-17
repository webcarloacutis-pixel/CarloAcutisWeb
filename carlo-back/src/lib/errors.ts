import { safeErrorDiagnostics } from "./error-diagnostics";
import type { ErrorRequestHandler } from "express";
export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (res.headersSent) return;
  if (error instanceof HttpError) { res.status(error.status).json({ error: error.code }); return; }
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
  if (code === "P2002") { res.status(409).json({ error: "ALREADY_EXISTS" }); return; }
  if (code === "P2025") { res.status(404).json({ error: "NOT_FOUND" }); return; }
  if (code === "P2003") { res.status(400).json({ error: "INVALID_REFERENCE" }); return; }
  if (status === 413) { res.status(413).json({ error: "BODY_TOO_LARGE" }); return; }
  if (error instanceof SyntaxError && status === 400) { res.status(400).json({ error: "INVALID_JSON" }); return; }
  // Never log request bodies, cookies, provider errors, SQL or stack traces.
  console.error("REQUEST_FAILED", safeErrorDiagnostics());
  res.status(500).json({ error: "INTERNAL_ERROR" });
};
