import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { aiErrorCodes } from "./ai-errors";
const permitted = new Set<string>([...aiErrorCodes, "OK", "INVALID_INPUT", "NOT_AUTHENTICATED", "AI_BUSY", "AI_REQUEST_CONFLICT", "AI_REQUEST_IN_PROGRESS", "AI_REQUEST_LEASE_LOST", "RATE_LIMITED", "DATABASE_UNAVAILABLE", "DATABASE_NOT_READY", "AUTH_NOT_CONFIGURED", "ADMIN_NOT_CONFIGURED", "CLIENT_CANCELLED"]);
function category(code: string, stage: string) {
  if (code === "CLIENT_CANCELLED") return "CLIENT_CANCELLED";
  if (code === "RATE_LIMITED") return "LOCAL_RATE_LIMIT";
  if (code === "AI_RATE_LIMIT") return "PROVIDER_RATE_LIMIT";
  if (code === "AI_QUOTA_EXCEEDED") return stage === "PROVIDER" ? "PROVIDER_QUOTA" : "LOCAL_QUOTA";
  if (["AI_BUSY", "AI_REQUEST_IN_PROGRESS"].includes(code)) return "CAPACITY";
  if (["AI_DISABLED", "AI_CONFIGURATION_MISSING", "AUTH_NOT_CONFIGURED", "ADMIN_NOT_CONFIGURED"].includes(code)) return "CONFIGURATION";
  if (["AI_PERSISTENCE_FAILED", "DATABASE_UNAVAILABLE", "DATABASE_NOT_READY"].includes(code)) return "DATABASE";
  if (code === "AI_TIMEOUT") return stage === "PROVIDER" ? "PROVIDER_TIMEOUT" : stage === "PERSISTENCE" ? "DATABASE_TIMEOUT" : "APPLICATION_TIMEOUT";
  if (code === "NOT_AUTHENTICATED") return "AUTHENTICATION";
  if (code === "OK") return "SUCCESS";
  return stage === "PROVIDER" ? "PROVIDER" : stage === "VALIDATION" ? "VALIDATION" : "APPLICATION";
}
export const aiObservation: RequestHandler = (req, res, next) => {
  // Express restores baseUrl when a mounted router forwards an error. Retain
  // only a known static namespace, never the original URL, IDs or query string.
  const originalMount = /^(\/(?:api\/)?(?:auth|saints|prayers|miracles|conversations|ai|popularity|discover-saint|descubrir-saint))(?=\/|\?|$)/i.exec(req.originalUrl || req.path)?.[1].toLowerCase() ?? "";
  const supplied = req.get("x-request-id");
  const requestId = supplied && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(supplied) ? supplied : randomUUID();
  res.locals.requestId = requestId;res.locals.aiStage = "VALIDATION";res.set("X-Request-Id", requestId);
  const started = performance.now();
  let logged = false;
  const record = (completed: boolean) => {
    if (logged) return;
    logged = true;
    const code = !completed ? "CLIENT_CANCELLED" : permitted.has(res.locals.aiCode) ? res.locals.aiCode : res.statusCode < 400 ? "OK" : res.statusCode === 401 ? "NOT_AUTHENTICATED" : res.statusCode < 500 ? "INVALID_INPUT" : "APPLICATION_ERROR";
    const base = /^\/(?:api\/)?(?:auth|saints|prayers|miracles|conversations|ai|popularity|discover-saint|descubrir-saint)$/i.test(req.baseUrl) ? req.baseUrl.toLowerCase() : originalMount;
    const ai = /^\/(?:api\/)?ai$/.test(base) || /^\/(?:api\/)?ai(?:\/|$)/.test(req.path);
    const stage = ai ? (["VALIDATION", "CONFIGURATION", "PERSISTENCE", "PROVIDER", "COMPLETE"].includes(res.locals.aiStage) ? res.locals.aiStage : "VALIDATION") : "EXPRESS";
    const safeCode = permitted.has(code) || ai ? code : res.statusCode < 500 ? "REQUEST_REJECTED" : "SERVICE_ERROR";
    const revision = /^[a-f0-9]{40}$/i.test(process.env.RENDER_GIT_COMMIT ?? "") ? process.env.RENDER_GIT_COMMIT : null;
    const method = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"].includes(req.method) ? req.method : "OTHER";
    const patterns: unknown = req.route?.path;
    const pattern = typeof patterns === "string" ? patterns : Array.isArray(patterns) ? patterns.find(value => value === req.path) : undefined;
    const route = typeof pattern === "string" && /^[A-Za-z0-9_/:*-]{1,200}$/.test(pattern) ?
      base && (pattern === base || pattern.startsWith(base + "/")) ? pattern : base + pattern : "UNMATCHED";
    console.info(ai ? "AI_REQUEST" : "API_REQUEST", { timestamp: new Date().toISOString(), revision, method, route, category: category(safeCode, stage), outcome: completed ? "COMPLETED" : "CLIENT_CANCELLED", requestId, stage, code: safeCode, httpStatus: completed ? res.statusCode : null, durationMs: Math.round(performance.now() - started) });
  };
  res.once("finish", () => record(true));
  res.once("close", () => record(false));
  next();
};
