import { proxyTrust } from "./client-address";
import { validateSupabaseRuntime } from "./supabase-config";
export function validateEnvironment() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32 || /dev_secret|change.?me|example/i.test(secret)) {
    throw new Error("JWT_SECRET must be a dedicated random secret of at least 32 characters");
  }
  const database = process.env.DATABASE_URL;
  if (!database || !/^postgres(ql)?:\/\//.test(database)) throw new Error("DATABASE_URL must explicitly configure PostgreSQL");
  const origin = process.env.FRONTEND_ORIGIN;
  if (!origin) throw new Error("FRONTEND_ORIGIN must be explicit");
  const parsed = new URL(origin);
  if (parsed.origin !== origin || !["http:", "https:"].includes(parsed.protocol)) throw new Error("FRONTEND_ORIGIN must contain only an HTTP(S) origin");
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error("Production FRONTEND_ORIGIN requires HTTPS");
  if (process.env.ADMIN_KEY && process.env.ADMIN_KEY.length < 32) throw new Error("ADMIN_KEY must have at least 32 characters");
  proxyTrust();
  validateSupabaseRuntime();
}

export function intSetting(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}
