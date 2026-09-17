import { HttpError } from "./errors";
export const aiErrorCodes = ["AI_DISABLED", "AI_CONFIGURATION_MISSING", "AI_PROVIDER_AUTH", "AI_MODEL_UNAVAILABLE", "AI_RATE_LIMIT", "AI_QUOTA_EXCEEDED", "AI_TIMEOUT", "AI_UPSTREAM_UNAVAILABLE", "AI_RESPONSE_INVALID", "AI_PERSISTENCE_FAILED"] as const;
export function ensureAiConfigured() {
  if (process.env.AI_ENABLED !== "true") throw new HttpError(503, "AI_DISABLED");
  if (!process.env.OPENAI_API_KEY?.trim()) throw new HttpError(503, "AI_CONFIGURATION_MISSING");
}
export function classifyAiProviderError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  const item = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const status = Number(item.status), code = typeof item.code === "string" ? item.code : "", kind = typeof item.type === "string" ? item.type : "";
  if (["APIConnectionTimeoutError", "APITimeoutError", "TimeoutError"].includes(String(item.name))) return new HttpError(504, "AI_TIMEOUT");
  if (code === "model_not_found" || (status === 404 && item.param === "model")) return new HttpError(502, "AI_MODEL_UNAVAILABLE");
  if (status === 401 || status === 403) return new HttpError(502, "AI_PROVIDER_AUTH");
  if (status === 429) {
    const quota = ["insufficient_quota", "credit_balance_exhausted", "organization_spend_limit_exceeded", "project_spend_limit_exceeded", "organization_usage_limit_exceeded"].includes(code) || kind === "insufficient_quota";
    return new HttpError(429, quota ? "AI_QUOTA_EXCEEDED" : "AI_RATE_LIMIT");
  }
  if (status === 400 || status === 422) return new HttpError(502, "AI_RESPONSE_INVALID");
  return new HttpError(503, "AI_UPSTREAM_UNAVAILABLE");
}
