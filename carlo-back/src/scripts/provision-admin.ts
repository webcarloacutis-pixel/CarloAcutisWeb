// Explicit maintenance command only. Never imported by the application server.
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, realpathSync } from "node:fs";
import { resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { provisionAdminAccount } from "../maintenance/admin-account";

async function main() {
  const raw = readFileSync(0,"utf8");
  if (raw.length > 16000) throw new Error("INVALID_INPUT");
  const input = JSON.parse(raw);
  const url = new URL(process.env.DIRECT_URL ?? "");
  const role = decodeURIComponent(url.username);
  const project = "rquzpsjismymbyijwhgj";
  const local = url.hostname === "127.0.0.1" && url.port === "55439" && url.pathname === "/acutis_repair_test";
  const remote = url.port === "5432" && url.pathname === "/postgres" && url.searchParams.get("schema") === "acutis" &&
    ((url.hostname === `db.${project}.supabase.co` && role === "postgres") || (url.hostname.endsWith(".pooler.supabase.com") && role === `postgres.${project}`)) &&
    url.searchParams.get("sslmode") === "require" && url.searchParams.get("sslaccept") === "strict" && Boolean(url.searchParams.get("sslcert"));
  if (!["postgres:","postgresql:"].includes(url.protocol) || !(local || remote) || role.startsWith("acutis_app")) throw new Error("MAINTENANCE_TARGET_REQUIRED");
  let backupFile: string | undefined;
  if (input.execute) {
    const directory = realpathSync(input.backupDirectory);
    backupFile = resolve(directory,`admin-account-${randomUUID()}.json`);
    const within = relative(process.cwd(),backupFile);
    if (!within.startsWith("..")) execFileSync("git",["check-ignore","--quiet","--",backupFile],{stdio:"pipe"});
  }
  const db = new PrismaClient({log:[],datasources:{db:{url:url.toString()}}});
  try {
    const result = await provisionAdminAccount(db,input,async snapshot => {writeFileSync(backupFile!,JSON.stringify(snapshot),{encoding:"utf8",flag:"wx",mode:0o600});});
    console.log(JSON.stringify(result));
  } finally {await db.$disconnect();}
}
void main().catch(()=>{console.error("ADMIN_PROVISIONING_FAILED");process.exitCode=1;});
