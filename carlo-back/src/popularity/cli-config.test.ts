import { describe, expect, it } from "vitest";
import { assertDatabaseTarget, executionConfig, parseCliArgs } from "./cli-config";
import { SpendBudget } from "./runner";

describe("popularity CLI safety", () => {
  it("defaults to a bounded offline verse dry run", () => {
    expect(parseCliArgs([], process.cwd())).toMatchObject({ execute: false, kind: "verse", limit: 20 });
  });
  it.each([["--limit", "101"], ["--limit", "0"], ["--kind", "user"], ["--execute", "--dry-run"], ["--execute", "--execute"]])(
    "rejects invalid or conflicting arguments %j", (...args: string[]) => {
      expect(() => parseCliArgs(args, process.cwd())).toThrow();
    },
  );
  it("requires explicit paid authorization and a separate test/project credential", () => {
    expect(() => executionConfig({})).toThrow("PAID_REQUESTS_NOT_AUTHORIZED");
    expect(() => executionConfig({ AI_ENABLED: "true", POPULARITY_ALLOW_PAID_REQUESTS: "true" })).toThrow("PROJECT_AI_CREDENTIAL_REQUIRED");
  });
  it("requires finite allowance and explicit applicable prices", () => {
    const env = { AI_ENABLED: "true", POPULARITY_ALLOW_PAID_REQUESTS: "true", OPENAI_API_KEY: "mock-project-key",
      OPENAI_MODEL: "test-model", POPULARITY_MAX_SPEND_USD: "1", POPULARITY_INPUT_USD_PER_MILLION: "1",
      POPULARITY_OUTPUT_USD_PER_MILLION: "2" };
    const config = executionConfig(env);
    expect(config.model).toBe("test-model");
    expect(new SpendBudget(config.budget).reservedUsd).toBe(0);
    expect(() => executionConfig({ ...env, POPULARITY_MAX_SPEND_USD: "Infinity" })).toThrow();
    expect(() => new SpendBudget({ ...config.budget, maxUsd: 101 })).toThrow();
    expect(() => executionConfig({ ...env, POPULARITY_RETRIES: "2" })).toThrow("INVALID_RETRIES");
  });
  it("rejects unintended database host and name without exposing connection strings", () => {
    const env = { DATABASE_URL: "postgresql://user:secret@127.0.0.1:5455/acutis_test_popularity",
      POPULARITY_DATABASE_HOST: "127.0.0.1:5455", POPULARITY_DATABASE_NAME: "acutis_test_popularity" };
    expect(() => assertDatabaseTarget(env)).not.toThrow();
    expect(() => assertDatabaseTarget({ ...env, POPULARITY_DATABASE_NAME: "another" })).toThrow("DATABASE_TARGET_MISMATCH");
    expect(() => assertDatabaseTarget({ ...env, POPULARITY_DATABASE_HOST: "remote.invalid" })).toThrow("DATABASE_TARGET_MISMATCH");
  });
});
