import { integrationDatabaseEnabled } from "../lib/test-database";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { applyBirthplaces,parseCorrections,parseMappings,validateMaintenanceTarget } from "./birthplaces";
const corrections=parseCorrections(JSON.parse(readFileSync(resolve(__dirname,"../../data/verified-birthplaces.json"),"utf8").replace(/^\uFEFF/,"")));
describe("guarded verified birthplace maintenance",()=>{
  it("requires an exact database target and explicit write enablement",()=>{
    expect(()=>validateMaintenanceTarget("postgresql://127.0.0.1/acutis_repair_test","other",false,undefined)).toThrow("EXPECTED_DATABASE_MISMATCH");
    expect(()=>validateMaintenanceTarget("postgresql://127.0.0.1/acutis_repair_test","acutis_repair_test",true,undefined)).toThrow("MAINTENANCE_EXECUTION_NOT_ENABLED");
    expect(validateMaintenanceTarget("postgresql://127.0.0.1/acutis_repair_test","acutis_repair_test",false,undefined).database).toBe("acutis_repair_test");
  });
  it("rejects arbitrary source identities, extra records and unsafe mappings",()=>{
    expect(()=>parseCorrections([...corrections,corrections[0]])).toThrow("THREE_VERIFIED_CORRECTIONS_REQUIRED");
    expect(()=>parseMappings([{sourceSlug:"invented",targetSlug:"safe",expectedName:"Name"}])).toThrow("INVALID_OR_DUPLICATE_MAPPING");
    expect(()=>parseMappings([{sourceSlug:corrections[0].slug,targetSlug:"safe",expectedName:"Name",userId:"inject"}])).toThrow("UNKNOWN_FIELD");
  });
});
const disposable=integrationDatabaseEnabled();
describe.skipIf(!disposable)("birthplace maintenance with real disposable PostgreSQL",()=>{
 const owned:string[]=[];
 async function record(data:Record<string,unknown>={}){
  const slug="audit-birth-"+randomUUID();
  const row=await prisma.saint.create({data:{slug,name:"Owned birthplace fixture",...data}});
  owned.push(row.id);
  return {row,mapping:{sourceSlug:corrections[0].slug,targetSlug:slug,expectedName:row.name}};
 }
 afterAll(async()=>{await prisma.saint.deleteMany({where:{id:{in:owned}}});await prisma.$disconnect();});
 it("dry-run does not write; explicit application fills null birth fields and preserves existing death year",async()=>{
  const {row,mapping}=await record({deathYear:1900});
  expect((await applyBirthplaces(prisma,corrections,[mapping]))[0].status).toBe("planned");
  expect((await prisma.saint.findUnique({where:{id:row.id}}))?.birthLat).toBeNull();
  expect((await applyBirthplaces(prisma,corrections,[mapping],true))[0].status).toBe("updated");
  const changed=await prisma.saint.findUnique({where:{id:row.id}});
  expect(changed?.birthLat).toBe(corrections[0].birthLat);
  expect(changed?.deathYear).toBe(1900);
  expect((await applyBirthplaces(prisma,corrections,[mapping],true))[0].status).toBe("preserved-existing-birth-data");
 });
 it("preserves manual partial data and refuses name mismatches without creating missing targets",async()=>{
  const {row,mapping}=await record({birthPlace:"Manual birthplace"});
  expect((await applyBirthplaces(prisma,corrections,[mapping],true))[0].status).toBe("preserved-existing-birth-data");
  expect((await prisma.saint.findUnique({where:{id:row.id}}))?.birthLat).toBeNull();
  expect((await applyBirthplaces(prisma,corrections,[{...mapping,expectedName:"Different person"}],true))[0].status).toBe("name-mismatch");
  const absent={...mapping,targetSlug:"audit-missing-"+randomUUID()};
  expect((await applyBirthplaces(prisma,corrections,[absent],true))[0].status).toBe("missing");
  expect(await prisma.saint.findUnique({where:{slug:absent.targetSlug}})).toBeNull();
 });
 it("compare-and-set refuses an intervening manual edit",async()=>{
  const {row,mapping}=await record();
  const racing={
   saint:{
    findUnique:async()=>{
     const stale=await prisma.saint.findUnique({where:{id:row.id}});
     await prisma.saint.update({where:{id:row.id},data:{birthPlace:"Concurrent manual edit"}});
     return stale;
    },
    updateMany:prisma.saint.updateMany.bind(prisma.saint),
   },
  } as unknown as PrismaClient;
  expect((await applyBirthplaces(racing,corrections,[mapping],true))[0].status).toBe("changed-concurrently");
  const after=await prisma.saint.findUnique({where:{id:row.id}});
  expect(after?.birthPlace).toBe("Concurrent manual edit");expect(after?.birthLat).toBeNull();
 });
});
