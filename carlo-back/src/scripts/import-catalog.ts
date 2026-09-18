import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { saintData, miracleData, prayerData, saintFields } from "../lib/content-validation";
import { CATALOG_CAPACITY } from "../lib/catalog-limits";
import { reserveCatalogCapacity } from "../lib/catalog-capacity";
import { saintSnapshot } from "../lib/saint-service";
import { editorialData } from "../lib/editorial-validation";
type Obj=Record<string,unknown>;
type Entry=Obj & {identityKey:string;originalNumber:number;miracles:Obj[];prayers:Obj[]};
type Snapshot={saint:Obj;miracles:Obj[];prayers:Obj[]};
function canonical(value:unknown):unknown {return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)])):value;}
export const contentHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function importDecision(previousHash:string,current:unknown,incoming:unknown):'create'|'update'|'unchanged'|'manual-edit-preserved'|'conflict' {
 const currentHash=contentHash(current),incomingHash=contentHash(incoming);
 if(currentHash!==previousHash)return incomingHash===previousHash?'manual-edit-preserved':'conflict';
 return incomingHash===previousHash?'unchanged':'update';
}
const miracleFields=['title','type','date','location','witnesses','approved','details'];
const prayerFields=['title','content','category','approved','saintName','occasion'];
const subset=(row:Obj,fields:string[])=>Object.fromEntries(fields.map(key=>[key,row[key]??null]));
async function currentSnapshot(tx:Prisma.TransactionClient,saintId:string,previous:Snapshot):Promise<Snapshot> {
 const saint=await tx.saint.findUniqueOrThrow({where:{id:saintId}});
 const miracles=await tx.miracle.findMany({where:{id:{in:previous.miracles.map(m=>String(m.id))}}});
 const prayers=await tx.prayer.findMany({where:{id:{in:previous.prayers.map(p=>String(p.id))}}});
 return {saint:saintSnapshot(saint),miracles:previous.miracles.map(before=>{const row=miracles.find(m=>m.id===before.id);return row?{id:row.id,...subset(row,miracleFields)}:{id:before.id,missing:true};}),prayers:previous.prayers.map(before=>{const row=prayers.find(p=>p.id===before.id);return row?{id:row.id,...subset(row,prayerFields)}:{id:before.id,missing:true};})};
}
async function verifyImage(root:string,entry:Entry) {
 if(typeof entry.imageUrl!=='string'||entry.imageUrl!==`/catalog/owner-2026/${entry.identityKey}.webp`)throw new Error('VERIFIED_LOCAL_IMAGE_REQUIRED');
 const proof=JSON.parse(await readFile(path.join(root,'.audit/acutis-closure/catalog-assets',entry.identityKey+'.json'),'utf8'));
 const data=await readFile(path.join(root,'carlo-front/public',entry.imageUrl));
 if(!proof.decoded||proof.identityKey!==entry.identityKey||proof.sha256!==createHash('sha256').update(data).digest('hex')||proof.width<160||proof.height<160||data.subarray(0,4).toString()!=='RIFF'||data.subarray(8,12).toString()!=='WEBP')throw new Error('IMAGE_PROOF_MISMATCH');
 const editorial=editorialData(entry.editorial);
 if(editorial.image?.sourceUrl!==proof.sourceUrl||editorial.image?.licenseUrl!==proof.licenseUrl)throw new Error('IMAGE_LICENSE_MISMATCH');
}
function incomingSnapshot(entry:Entry):Snapshot {
 const body=Object.fromEntries(saintFields.filter(key=>entry[key]!==undefined).map(key=>[key,entry[key]]));
 saintData(body);const editorial=editorialData(body.editorial);
 if(!editorial.sources.length||typeof body.biography!=='string'||body.biography.trim().length<300)throw new Error('SOURCED_BIOGRAPHY_REQUIRED');
 const miracles=entry.miracles.map((value,index)=>({id:`catalog-${entry.identityKey}-m${index+1}`,...subset(miracleData(value),miracleFields)}));
 const prayers=entry.prayers.map((value,index)=>({id:`catalog-${entry.identityKey}-p${index+1}`,...subset(prayerData({...value,saintName:body.name}),prayerFields)}));
 return {saint:saintSnapshot(body),miracles,prayers};
}
export async function importEntry(entry:Entry,execute:boolean) {
 const incoming=incomingSnapshot(entry);const hash=contentHash(incoming);
 return prisma.$transaction(async tx=>{
  // Acquire creation locks before reading, at READ COMMITTED: a waiter must count
  // the previous writer's committed rows, not a Serializable transaction's old snapshot.
  if(execute){
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(30002026, 1)`;
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(30002026, 2)`;
  }
  const binding=await tx.catalogImport.findUnique({where:{identityKey:entry.identityKey}});
  if(binding&&binding.saintId===null)return{identityKey:entry.identityKey,originalNumber:entry.originalNumber,action:'conflict',reason:'ADMIN_DELETION_PRESERVED_REIMPORT_REQUIRES_REVIEW'};
  const saintId=binding?.saintId??`catalog-${entry.identityKey}`;
  let decision:string='create';
  if(binding){
   const old=binding.snapshot as unknown as Snapshot;
   // Preserve manual edits while changing isolation: lock the exact rows before
   // comparing their snapshots; no editor can change them between compare/update.
   if(execute){
    await tx.$queryRaw`SELECT "id" FROM "Saint" WHERE "id" = ${saintId} FOR UPDATE`;
    if(old.miracles.length)await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Miracle" WHERE "id" IN (${Prisma.join(old.miracles.map(record=>String(record.id)))}) ORDER BY "id" FOR UPDATE`);
    if(old.prayers.length)await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Prayer" WHERE "id" IN (${Prisma.join(old.prayers.map(record=>String(record.id)))}) ORDER BY "id" FOR UPDATE`);
   }
   const current=await currentSnapshot(tx,saintId,old);
   decision=importDecision(binding.importedHash,current,incoming);
   if(old.miracles.some(m=>!incoming.miracles.some(n=>n.id===m.id))||old.prayers.some(m=>!incoming.prayers.some(n=>n.id===m.id)))decision='conflict';
  } else {
   const collision=await tx.saint.findFirst({where:{OR:[{id:saintId},{slug:String(incoming.saint.slug)},{name:{equals:String(incoming.saint.name),mode:'insensitive'}}]},select:{id:true}});
   if(collision)return {identityKey:entry.identityKey,originalNumber:entry.originalNumber,saintId:collision.id,action:'conflict',reason:'EXISTING_UNBOUND_IDENTITY_REQUIRES_EXPLICIT_MAPPING'};
  }
  if(execute&&['create','update'].includes(decision)) {
   const data=saintData(incoming.saint);
   if(decision==='create')await reserveCatalogCapacity(tx,'saint');
   const existingMiracles=await tx.miracle.count({where:{id:{in:incoming.miracles.map(record=>String(record.id))}}});
   await reserveCatalogCapacity(tx,'miracle',incoming.miracles.length-existingMiracles);
   if(decision==='create')await tx.saint.create({data:{...data,id:saintId}});else await tx.saint.update({where:{id:saintId},data});
   for(const record of incoming.miracles){const {id,...body}=record;const data=miracleData(body);await tx.miracle.upsert({where:{id:String(id)},create:{...data,id:String(id),saintId},update:data});}
   for(const record of incoming.prayers){const {id,...body}=record;const data=prayerData(body);await tx.prayer.upsert({where:{id:String(id)},create:{...data,id:String(id)},update:data});}
   await tx.catalogImport.upsert({where:{identityKey:entry.identityKey},create:{identityKey:entry.identityKey,saintId,importedHash:hash,snapshot:incoming as unknown as Prisma.InputJsonValue},update:{importedHash:hash,snapshot:incoming as unknown as Prisma.InputJsonValue}});
  }
  return {identityKey:entry.identityKey,originalNumber:entry.originalNumber,saintId,slug:incoming.saint.slug,action:decision,executed:execute&&['create','update'].includes(decision),contentHash:hash};
 },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,timeout:10000});
}
async function main() {
 const args=process.argv.slice(2),value=(key:string)=>args[args.indexOf(key)+1];
 if(!args.includes('--batch')||!args.includes('--expected-database'))throw new Error('Usage: --batch REVIEWED_JSON --expected-database acutis_editorial_local [--execute]');
 const url=new URL(process.env.DATABASE_URL??'');
 if(url.hostname!=='127.0.0.1'||url.port!=='55439'||url.pathname!=='/acutis_editorial_local'||value('--expected-database')!=='acutis_editorial_local')throw new Error('LOCAL_EDITORIAL_DATABASE_ONLY');
 if(process.env.ACUTIS_INTEGRATION_TEST==='1')throw new Error('FIXTURE_ENVIRONMENT_FORBIDDEN');
 const root=path.resolve(__dirname,'../../..'),batch=path.resolve(value('--batch'));
 if(!batch.startsWith(root+path.sep))throw new Error('BATCH_OUTSIDE_CHECKOUT');
 const entries:Entry[]=JSON.parse((await readFile(batch,'utf8')).replace(/^\uFEFF/,''));
 if(!Array.isArray(entries)||entries.length<1||entries.length>20)throw new Error('BATCH_SIZE_1_TO_20_REQUIRED');
 const seen=new Set<string>();
 for(const entry of entries){if(!/^owner-2026-\d{3,4}$/.test(entry.identityKey)||seen.has(entry.identityKey)||!Number.isInteger(entry.originalNumber)||entry.originalNumber<1||entry.originalNumber>CATALOG_CAPACITY)throw new Error('INVALID_OR_DUPLICATE_IDENTITY');seen.add(entry.identityKey);incomingSnapshot(entry);await verifyImage(root,entry);}
 const target=await prisma.$queryRaw<{database:string;host:string;port:number}[]>`SELECT current_database() as database, host(inet_server_addr()) as host, inet_server_port() as port`;
 if(target[0]?.database!=='acutis_editorial_local'||target[0]?.host!=='127.0.0.1'||target[0]?.port!==55439)throw new Error('DATABASE_IDENTITY_MISMATCH');
 const execute=args.includes('--execute'),runId=process.env.ACUTIS_RUN_ID??new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8);
 const stageId=process.env.ACUTIS_STAGE_ID??(execute?'import':'preview');if(!/^[a-zA-Z0-9_-]+$/.test(stageId))throw new Error('INVALID_STAGE_ID');
 const folder=path.join(root,'.audit/acutis-closure/catalog-imports',runId,stageId);await mkdir(path.dirname(folder),{recursive:true});await mkdir(folder);
 const records:Obj[]=[];
 for(const entry of entries){
  let record:Obj;
  try{record=await importEntry(entry,execute);}catch(error){record={identityKey:entry.identityKey,action:'error',error:error instanceof Error?error.message:'IMPORT_ERROR'};}
  records.push(record);await appendFile(path.join(folder,'progress.jsonl'),JSON.stringify(record)+'\n');console.log(JSON.stringify(record));
 }
 const conflicts=records.filter(record=>['conflict','error'].includes(String(record.action)));
 const report={run_id:runId,generated_at:new Date().toISOString(),result:conflicts.length?'FAIL':'PASS',mode:execute?'execute':'preview',target:target[0],batch:path.relative(root,batch),records,counts:{examined:records.length,created:records.filter(r=>r.action==='create'&&r.executed).length,updated:records.filter(r=>r.action==='update'&&r.executed).length,unchanged:records.filter(r=>r.action==='unchanged').length,manualEditsPreserved:records.filter(r=>r.action==='manual-edit-preserved').length,conflicts:conflicts.length}};
 await writeFile(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');if(process.env.ACUTIS_REPORT_PATH)await writeFile(process.env.ACUTIS_REPORT_PATH,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,mode:report.mode,...report.counts}));if(conflicts.length)process.exitCode=2;
}
if(require.main===module)void main().catch(error=>{console.error(error instanceof Error?error.message:'IMPORT_FAILED');process.exitCode=1;}).finally(()=>prisma.$disconnect());
