import { Prisma, type Saint } from "@prisma/client";
import { prisma } from "./prisma";
import { reserveCatalogCapacity } from "./catalog-capacity";
import { saintData, saintFields } from "./content-validation";
import { HttpError } from "./errors";
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
  saintData(input,true); // Reject protected/unknown fields before merging persisted values.
  return prisma.$transaction(async tx=>{
    const current=await tx.saint.findUnique({where:{id:saintId}});
    if(!current)throw new HttpError(404,"SAINT_NOT_FOUND");
    const data=saintData({...saintSnapshot(current),...(input as Record<string,unknown>)});
    return tx.saint.update({where:{id:saintId},data});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
