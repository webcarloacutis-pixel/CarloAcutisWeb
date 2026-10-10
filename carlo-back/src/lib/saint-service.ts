import { Prisma, type Saint } from "@prisma/client";
import { prisma } from "./prisma";
import { reserveCatalogCapacity } from "./catalog-capacity";
import { saintData, saintFields } from "./content-validation";
import { HttpError } from "./errors";
import { objectBody } from "./validation";
export function saintSnapshot(saint: Partial<Saint> | Record<string, unknown>): Record<string, unknown> {
  const raw=saint as Record<string,unknown>;
  return Object.fromEntries(saintFields.map(key=>[key,raw[key] ?? (["birthSources","patronOf","symbols"].includes(key)?[]:null)]));
}
export async function createSaint(input: unknown) {
  const data = saintData(input);
  return prisma.$transaction(async tx => {
    await reserveCatalogCapacity(tx, "saint");
    return tx.saint.create({ data });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
export async function updateSaint(saintId:string,input:unknown) {
  // Reject protected/unknown fields before merging. Cross-field rules apply to
  // the resulting record, so a coordinate edit may use its persisted partner.
  const submitted = objectBody(input,saintFields);
  const body = Object.fromEntries(Object.entries(submitted).filter(([,value])=>value!==undefined));
  if(Object.keys(body).length===0)throw new HttpError(400,"EMPTY_UPDATE");
  return prisma.$transaction(async tx=>{
    const current=await tx.saint.findUnique({where:{id:saintId}});
    if(!current)throw new HttpError(404,"SAINT_NOT_FOUND");
    const merged={...saintSnapshot(current),...body};
    if(!Object.prototype.hasOwnProperty.call(body,"editorial")) {
      // Existing legacy JSON is not a new editorial submission. Preserve it exactly
      // when editing another field; new/changed editorial input stays strictly validated.
      delete merged.editorial;
      const editorial=current.editorial;
      if(editorial && typeof editorial==='object' && !Array.isArray(editorial) &&
         ['archangel','collective'].includes(String(editorial.kind)) &&
         ['birthYear','deathYear','birthLat','birthLng','birthCountryCode','birthPlace'].some(key=>merged[key]!=null))
        throw new HttpError(400,"NON_PERSON_BIRTH_NOT_APPLICABLE");
    }
    const validated=saintData(merged);
    // Snapshot defaults and validation normalization must never rewrite an
    // omitted field (including legacy SQL/JSON nulls or editorial metadata).
    const data=Object.fromEntries(Object.entries(validated).filter(([key])=>Object.prototype.hasOwnProperty.call(body,key)));
    return tx.saint.update({where:{id:saintId},data});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
