import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { aiErrorCodes } from "./ai-errors";
const permitted = new Set<string>([...aiErrorCodes, "OK", "INVALID_INPUT", "NOT_AUTHENTICATED", "AI_BUSY", "AI_REQUEST_CONFLICT", "AI_REQUEST_IN_PROGRESS", "AI_REQUEST_LEASE_LOST"]);
export const aiObservation: RequestHandler = (req, res, next) => {
  const supplied = req.get("x-request-id");
  const requestId = supplied && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(supplied) ? supplied : randomUUID();
  res.locals.requestId = requestId;res.locals.aiStage = "VALIDATION";res.set("X-Request-Id", requestId);
  const started = performance.now();
  res.once("finish", () => {
    const code = permitted.has(res.locals.aiCode) ? res.locals.aiCode : res.statusCode < 400 ? "OK" : res.statusCode === 429 ? "AI_RATE_LIMIT" : res.statusCode < 500 ? "INVALID_INPUT" : "AI_UPSTREAM_UNAVAILABLE";
    const stage = ["VALIDATION", "CONFIGURATION", "PERSISTENCE", "PROVIDER", "COMPLETE"].includes(res.locals.aiStage) ? res.locals.aiStage : "VALIDATION";
    console.info("AI_REQUEST", { requestId, stage, code, httpStatus: res.statusCode, durationMs: Math.round(performance.now() - started) });
  });
  next();
};
