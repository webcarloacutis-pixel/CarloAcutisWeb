import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openSpendLedger } from "./spend-ledger";

const paths: string[] = [];
const config = { maxUsd: 0.01, inputUsdPerMillion: 1, outputUsdPerMillion: 1 };
function file() { const dir = mkdtempSync(join(tmpdir(), "acutis-spend-test-")); paths.push(dir); return join(dir, "budget.json"); }
afterEach(() => { for (const dir of paths.splice(0)) rmSync(dir, { recursive: true }); });

describe("persistent maintenance spend allowance", () => {
  it("reserves before dispatch and carries the same total across resumed commands", () => {
    const path = file();
    const first = openSpendLedger(path, "mock-model", config);
    first.budget.reserve("system", "public fixture", 384);
    const spent = first.budget.reservedUsd;
    expect(JSON.parse(readFileSync(path, "utf8")).reservedMicros).toBe(spent * 1000000);
    first.close();
    const resumed = openSpendLedger(path, "mock-model", config);
    expect(resumed.budget.reservedUsd).toBe(spent);
    resumed.budget.reserve("system", "public fixture", 384);
    expect(resumed.budget.reservedUsd).toBe(spent * 2);
    resumed.close();
  });
  it("rejects concurrent commands using one allowance and refuses changed prices/model/limit", () => {
    const path = file();
    const first = openSpendLedger(path, "mock-model", config);
    expect(() => openSpendLedger(path, "mock-model", config)).toThrow("SPEND_LEDGER_LOCKED_OR_UNAVAILABLE");
    first.close();
    expect(() => openSpendLedger(path, "other-model", config)).toThrow("SPEND_LEDGER_CONFIG_MISMATCH");
    expect(() => openSpendLedger(path, "mock-model", { ...config, maxUsd: 1 })).toThrow("SPEND_LEDGER_CONFIG_MISMATCH");
  });
  it("never resets a corrupt ledger or refunds a failed/unknown attempt", () => {
    const path = file();
    writeFileSync(path, "{corrupt");
    expect(() => openSpendLedger(path, "mock-model", config)).toThrow("INVALID_SPEND_LEDGER");
    expect(readFileSync(path, "utf8")).toBe("{corrupt");
  });
  it("stops a resumed run at the cumulative limit", () => {
    const path = file(); const budgetConfig = { ...config, maxUsd: 0.003 };
    const first = openSpendLedger(path, "mock-model", budgetConfig);
    first.budget.reserve("system", "public fixture", 384); first.close();
    const resumed = openSpendLedger(path, "mock-model", budgetConfig);
    expect(() => resumed.budget.reserve("system", "public fixture", 384)).toThrow("SPEND_LIMIT");
    resumed.close();
  });
  it("refuses invalid stored totals and relative paths", () => {
    expect(() => openSpendLedger("relative.json", "mock-model", config)).toThrow("ABSOLUTE_SPEND_LEDGER_PATH_REQUIRED");
    const path = file();
    const first = openSpendLedger(path, "mock-model", config); first.close();
    const row = JSON.parse(readFileSync(path, "utf8"));
    writeFileSync(path, JSON.stringify({ ...row, reservedMicros: -1 }));
    expect(() => openSpendLedger(path, "mock-model", config)).toThrow("SPEND_LEDGER_CONFIG_MISMATCH");
  });
});
