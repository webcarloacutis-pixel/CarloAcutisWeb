import {describe, expect, it} from "vitest";
import {validateSupabaseRuntime} from "./supabase-config";
const direct = "postgresql://acutis_app:fixture@db.rquzpsjismymbyijwhgj.supabase.co:5432/postgres?schema=acutis&sslmode=require&sslaccept=strict";
const env = (url = direct): NodeJS.ProcessEnv => ({DATABASE_PROVIDER:"supabase", DATABASE_URL:url});
describe("Supabase runtime boundary", () => {
  it("allows the limited role on the exact project using verified TLS", () => {
    expect(() => validateSupabaseRuntime(env())).not.toThrow();
    expect(() => validateSupabaseRuntime(env(direct.replace("acutis_app:fixture@db.rquzpsjismymbyijwhgj.supabase.co", "acutis_app.rquzpsjismymbyijwhgj:fixture@aws-0-test.pooler.supabase.com")))).not.toThrow();
  });
  it("rejects wrong projects, privileged roles, unverified TLS and transaction pooling", () => {
    for (const url of [direct.replace("rquzpsjismymbyijwhgj", "other"), direct.replace("acutis_app:", "postgres:"), direct.replace("strict", "accept_invalid_certs"), direct.replace("5432", "6543"), direct.replace("schema=acutis", "schema=public"), direct.replace("sslmode=require", "sslmode=disable"), direct+"&sslaccept=accept_invalid_certs"]) {
      expect(() => validateSupabaseRuntime(env(url))).toThrow();
    }
  });
  it("refuses maintenance credentials in the runtime and preserves explicit local development", () => {
    expect(() => validateSupabaseRuntime({...env(), DIRECT_URL:direct})).toThrow("Maintenance");
    expect(() => validateSupabaseRuntime({...env(), SUPABASE_SECRET_KEY:"fixture"})).toThrow("Maintenance");
    expect(() => validateSupabaseRuntime({})).not.toThrow();
  });
});
