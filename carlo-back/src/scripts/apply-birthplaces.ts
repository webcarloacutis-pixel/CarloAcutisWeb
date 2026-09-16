import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errors";
import { applyBirthplaces, parseCorrections, parseMappings, validateMaintenanceTarget } from "../maintenance/birthplaces";
async function main(){
  const args=process.argv.slice(2);
  const known=["--mapping","--expected-database","--dry-run","--execute"];
  for(let index=0;index<args.length;index++){
    if(!known.includes(args[index]))throw new HttpError(400,"UNKNOWN_ARGUMENT");
    if(["--mapping","--expected-database"].includes(args[index])){
      if(!args[index+1]||args[index+1].startsWith("--"))throw new HttpError(400,"MISSING_ARGUMENT");
      index++;
    }
  }
  if(args.includes("--execute")&&args.includes("--dry-run"))throw new HttpError(400,"CONFLICTING_MODE");
  const argument=(name:string)=>{const index=args.indexOf(name);return index<0?undefined:args[index+1];};
  const mappingPath=argument("--mapping");
  if(!mappingPath)throw new HttpError(400,"MAPPING_FILE_REQUIRED");
  const execute=args.includes("--execute");
  const target=validateMaintenanceTarget(process.env.DATABASE_URL,argument("--expected-database"),execute,process.env.ALLOW_BIRTHPLACE_MAINTENANCE);
  const corrections=parseCorrections(JSON.parse((await readFile(resolve(__dirname,"../../data/verified-birthplaces.json"),"utf8")).replace(/^\uFEFF/,"")));
  const mappings=parseMappings(JSON.parse((await readFile(resolve(mappingPath),"utf8")).replace(/^\uFEFF/,"")));
  const result=await applyBirthplaces(prisma,corrections,mappings,execute);
  console.log(JSON.stringify({dryRun:!execute,target,result},null,2));
}
main().catch(error=>{console.error(error instanceof HttpError?error.code:"BIRTHPLACE_MAINTENANCE_FAILED");process.exitCode=1;}).finally(()=>prisma.$disconnect());
