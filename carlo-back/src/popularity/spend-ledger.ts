import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { PopularityError } from "./domain";
import { SpendBudget, type BudgetConfig } from "./runner";

interface SpendLedger {
  version: 1; model: string; config: BudgetConfig; reservedMicros: number; updatedAt: string;
}

/** Local maintenance ledger. A crashed command keeps its lock for deliberate recovery. */
export function openSpendLedger(file: string, model: string, config: BudgetConfig): { budget: SpendBudget; close: () => void } {
  // Validate allowance/prices before obtaining a lock or writing any file.
  new SpendBudget(config);
  if (!isAbsolute(file)) throw new PopularityError("ABSOLUTE_SPEND_LEDGER_PATH_REQUIRED");
  const lockFile = file + ".lock";
  let lock: number;
  try { lock = openSync(lockFile, "wx", 0o600); }
  catch { throw new PopularityError("SPEND_LEDGER_LOCKED_OR_UNAVAILABLE"); }
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    closeSync(lock);
    unlinkSync(lockFile);
  };
  try {
    const initial: SpendLedger = { version: 1, model, config, reservedMicros: 0, updatedAt: new Date().toISOString() };
    let stored: SpendLedger = initial;
    if (existsSync(file)) {
      const stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 10000) throw new PopularityError("INVALID_SPEND_LEDGER");
      const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
      if (!parsed || typeof parsed !== "object") throw new PopularityError("INVALID_SPEND_LEDGER");
      const row = parsed as Partial<SpendLedger>;
      if (row.version !== 1 || !Number.isSafeInteger(row.reservedMicros) || row.reservedMicros! < 0 ||
          row.model !== model || row.config?.maxUsd !== config.maxUsd ||
          row.config?.inputUsdPerMillion !== config.inputUsdPerMillion || row.config?.outputUsdPerMillion !== config.outputUsdPerMillion ||
          row.reservedMicros! > Math.floor(config.maxUsd * 1000000)) throw new PopularityError("SPEND_LEDGER_CONFIG_MISMATCH");
      stored = row as SpendLedger;
    }
    const persist = (reservedMicros: number) => {
      const temporary = file + "." + process.pid + ".tmp";
      let fd: number | undefined;
      try {
        fd = openSync(temporary, "wx", 0o600);
        writeFileSync(fd, JSON.stringify({ ...initial, reservedMicros, updatedAt: new Date().toISOString() }) + "\n", "utf8");
        fsyncSync(fd); closeSync(fd); fd = undefined;
        renameSync(temporary, file);
      } catch {
        if (fd !== undefined) closeSync(fd);
        // Fail closed before a provider call; never print file paths or contents.
        throw new PopularityError("SPEND_LEDGER_WRITE_FAILED");
      }
    };
    if (!existsSync(file)) persist(0);
    return { budget: new SpendBudget(config, { initialReservedMicros: stored.reservedMicros, onReservation: persist }), close };
  } catch (error) {
    close();
    if (error instanceof PopularityError) throw error;
    throw new PopularityError("INVALID_SPEND_LEDGER");
  }
}
