import { Prisma, type PrismaClient } from "@prisma/client";
import { HttpError } from "../lib/errors";
import { saintData } from "../lib/content-validation";
import { objectBody, text } from "../lib/validation";
const sourceSlugs=["test-san-francisco","test-santa-clara","test-santa-teresa"];
const birthFields=["birthPlace","birthCountryCode","birthContinent","birthLat","birthLng","birthPrecision","birthSources"] as const;
export interface BirthplaceCorrection {
  slug:string;deathYear:number;birthPlace:string;birthCountryCode:string;birthContinent:string;
  birthLat:number;birthLng:number;birthPrecision:string;birthSources:string[];
}
export interface BirthplaceMapping {sourceSlug:string;targetSlug:string;expectedName:string}
export function parseCorrections(input:unknown):BirthplaceCorrection[] {
  if(!Array.isArray(input)||input.length!==3)throw new HttpError(400,"THREE_VERIFIED_CORRECTIONS_REQUIRED");
  const seen=new Set<string>();
  return input.map((entry)=>{
    const body=objectBody(entry,["slug","deathYear",...birthFields]);
    const slug=text(body.slug,100,true)!;
    if(!sourceSlugs.includes(slug)||seen.has(slug))throw new HttpError(400,"UNKNOWN_OR_DUPLICATE_CORRECTION");
    seen.add(slug);
    const validated=saintData(body,true);
    if(typeof validated.deathYear!=="number"||birthFields.some(field=>validated[field]===undefined||validated[field]===null))throw new HttpError(400,"INCOMPLETE_VERIFIED_CORRECTION");
    return validated as unknown as BirthplaceCorrection;
  });
}
export function parseMappings(input:unknown):BirthplaceMapping[] {
  if(!Array.isArray(input)||input.length<1||input.length>3)throw new HttpError(400,"MAPPING_REQUIRED");
  const sources=new Set<string>(),targets=new Set<string>();
  return input.map(entry=>{
    const body=objectBody(entry,["sourceSlug","targetSlug","expectedName"]);
    const sourceSlug=text(body.sourceSlug,100,true)!,targetSlug=text(body.targetSlug,100,true)!,expectedName=text(body.expectedName,200,true)!;
    if(!sourceSlugs.includes(sourceSlug)||sources.has(sourceSlug)||targets.has(targetSlug)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(targetSlug))throw new HttpError(400,"INVALID_OR_DUPLICATE_MAPPING");
    sources.add(sourceSlug);targets.add(targetSlug);
    return {sourceSlug,targetSlug,expectedName};
  });
}
export function validateMaintenanceTarget(rawUrl:string|undefined,expectedDatabase:string|undefined,execute:boolean,allowExecute:string|undefined){
  let url:URL;
  try{url=new URL(rawUrl||"");}catch{throw new HttpError(400,"DATABASE_URL_REQUIRED");}
  if(!["postgres:","postgresql:"].includes(url.protocol)||!expectedDatabase||decodeURIComponent(url.pathname.slice(1))!==expectedDatabase)throw new HttpError(400,"EXPECTED_DATABASE_MISMATCH");
  if(execute&&allowExecute!=="true")throw new HttpError(403,"MAINTENANCE_EXECUTION_NOT_ENABLED");
  return {host:url.hostname,database:expectedDatabase};
}
export async function applyBirthplaces(client:PrismaClient,corrections:BirthplaceCorrection[],mappings:BirthplaceMapping[],execute=false){
  const result=[];
  for(const mapping of mappings){
    const correction=corrections.find(row=>row.slug===mapping.sourceSlug);
    if(!correction)throw new HttpError(400,"MISSING_VERIFIED_CORRECTION");
    const row=await client.saint.findUnique({where:{slug:mapping.targetSlug}});
    const key={sourceSlug:mapping.sourceSlug,targetSlug:mapping.targetSlug};
    if(!row){result.push({...key,status:"missing"});continue;}
    if(row.name!==mapping.expectedName){result.push({...key,status:"name-mismatch"});continue;}
    if(birthFields.some(field=>row[field]!==null)){result.push({...key,status:"preserved-existing-birth-data"});continue;}
    const data={
      birthPlace:correction.birthPlace,birthCountryCode:correction.birthCountryCode,birthContinent:correction.birthContinent,
      birthLat:correction.birthLat,birthLng:correction.birthLng,birthPrecision:correction.birthPrecision,birthSources:correction.birthSources,
      ...(row.deathYear===null?{deathYear:correction.deathYear}:{}),
    };
    if(!execute){result.push({...key,status:"planned",expectedName:row.name,changes:data});continue;}
    // Compare-and-set protects manual edits that happen after the read.
    const updated=await client.saint.updateMany({
      where:{id:row.id,name:mapping.expectedName,deathYear:row.deathYear,birthPlace:null,birthCountryCode:null,birthContinent:null,birthLat:null,birthLng:null,birthPrecision:null,birthSources:{equals:Prisma.DbNull}},
      data,
    });
    result.push({...key,status:updated.count===1?"updated":"changed-concurrently"});
  }
  return result;
}
