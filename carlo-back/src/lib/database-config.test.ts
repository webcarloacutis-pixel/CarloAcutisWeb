import { describe, expect, it } from "vitest";
import { databaseUrlWithPool } from "./database-config";
describe("enforced PostgreSQL pool budget",()=>{
  it("sets the default pool to five even when the provider URI omits it",()=>{
    const url=new URL(databaseUrlWithPool("postgresql://fixture:fixture@127.0.0.1:55439/acutis_repair_test","5"));
    expect(url.searchParams.get("connection_limit")).toBe("5");
    expect(url.searchParams.get("pool_timeout")).toBe("10");
  });
  it("overrides a URI requesting too many connections",()=>{
    const url=new URL(databaseUrlWithPool("postgresql://fixture:fixture@127.0.0.1/db?connection_limit=100&schema=public","3"));
    expect(url.searchParams.get("connection_limit")).toBe("3");
    expect(url.searchParams.get("schema")).toBe("public");
  });
  it("rejects invalid limits and database schemes",()=>{
    for(const value of ["0","11","1.5","NaN"])expect(()=>databaseUrlWithPool("postgresql://127.0.0.1/db",value)).toThrow("DB_CONNECTION_LIMIT");
    expect(()=>databaseUrlWithPool("https://example.invalid","5")).toThrow("DATABASE_URL");
  });
});
