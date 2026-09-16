import { describe, expect, it } from "vitest";
import { integrationDatabaseEnabled } from "./test-database";
describe("disposable integration target gate", () => {
  it("does not enable writes without the explicit flag", () => {
    expect(integrationDatabaseEnabled({DATABASE_URL:"postgresql://127.0.0.1:55439/acutis_repair_test"})).toBe(false);
  });
  it("fails before writes when enabled against a wrong or missing target", () => {
    for (const url of [undefined,"postgresql://127.0.0.1:5432/acutis_repair_test","postgresql://remote.invalid:55439/acutis_repair_test","postgresql://localhost:55439/production","https://localhost:55439/acutis_repair_test"]) expect(() => integrationDatabaseEnabled({ACUTIS_INTEGRATION_TEST:"1",DATABASE_URL:url})).toThrow("EXACT_DISPOSABLE_DATABASE_REQUIRED");
  });
  it("accepts only the identified local database and port", () => {
    for (const host of ["localhost","127.0.0.1"]) expect(integrationDatabaseEnabled({ACUTIS_INTEGRATION_TEST:"1",DATABASE_URL:`postgresql://${host}:55439/acutis_repair_test`})).toBe(true);
  });
});
