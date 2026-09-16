import { integrationDatabaseEnabled } from "./test-database";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "./prisma";
import { consumeQuota, privateHash, withAiCapacity } from "./ai";
import { inputHash, withAiIdempotency } from "./ai-idempotency";
const enabled = integrationDatabaseEnabled();
describe.skipIf(!enabled)("AI coordination with real disposable PostgreSQL and stubbed generation",() => {
  const prefix="audit_ai_"+randomUUID();
  const requests:string[]=[];
  const quotas:string[]=[];
  afterAll(async() => {
    await prisma.aiRequest.deleteMany({where:{id:{in:requests}}});
    await prisma.apiQuota.deleteMany({where:{key:{in:quotas}}});
    await prisma.$disconnect();
  });
  it("enforces an atomic shared quota under concurrent callers",async() => {
    const scope=prefix+":quota";
    const windowMs=86400000;
    quotas.push(privateHash(scope+":"+Math.floor(Date.now()/windowMs)));
    const results=await Promise.allSettled(Array.from({length:10},()=>consumeQuota(scope,3,windowMs)));
    expect(results.filter((result)=>result.status==="fulfilled")).toHaveLength(3);
    expect(results.filter((result)=>result.status==="rejected")).toHaveLength(7);
  });
  it("deduplicates completed work and rejects reuse with different content",async() => {
    const key=prefix+":complete"; requests.push(key);
    const work=vi.fn().mockResolvedValue({text:"Fixture",model:"fixture-model"});
    const hash=inputHash("fixture");
    expect(await withAiIdempotency(key,hash,work)).toEqual({text:"Fixture",model:"fixture-model"});
    expect(await withAiIdempotency(key,hash,work)).toEqual({text:"Fixture",model:"fixture-model"});
    expect(work).toHaveBeenCalledOnce();
    await expect(withAiIdempotency(key,inputHash("changed"),work)).rejects.toThrow("AI_REQUEST_CONFLICT");
    expect(work).toHaveBeenCalledOnce();
  });
  it("allows only one owner of a pending duplicate request",async() => {
    const key=prefix+":pending"; requests.push(key);
    let release!:()=>void;
    const gate=new Promise<void>((resolve)=>{release=resolve;});
    const work=vi.fn(async()=>{await gate; return {text:"Only once",model:"fixture-model"};});
    const first=withAiIdempotency(key,inputHash("pending"),work);
    await vi.waitFor(()=>expect(work).toHaveBeenCalledOnce());
    await expect(withAiIdempotency(key,inputHash("pending"),work)).rejects.toThrow("AI_REQUEST_IN_PROGRESS");
    release(); await first;
    expect(work).toHaveBeenCalledOnce();
  });
  it("retains a failed provider lease to prevent immediate duplicate attempts",async() => {
    const key=prefix+":failed"; requests.push(key);
    const work=vi.fn().mockRejectedValue(new Error("isolated provider outage"));
    await expect(withAiIdempotency(key,inputHash("failure"),work)).rejects.toThrow("isolated provider outage");
    await expect(withAiIdempotency(key,inputHash("failure"),work)).rejects.toThrow("AI_REQUEST_IN_PROGRESS");
    expect(work).toHaveBeenCalledOnce();
    expect((await prisma.aiRequest.findUnique({where:{id:key}}))?.response).toBeNull();
  });
  it("shares provider concurrency across independently executing callers",async() => {
    const previous=process.env.AI_MAX_CONCURRENCY;
    process.env.AI_MAX_CONCURRENCY="1";
    let release!:()=>void;
    const gate=new Promise<void>((resolve)=>{release=resolve;});
    const firstWork=vi.fn(async()=>{await gate;return "first";});
    try {
      const first=withAiCapacity(firstWork);
      await vi.waitFor(()=>expect(firstWork).toHaveBeenCalledOnce());
      const secondWork=vi.fn(async()=>"second");
      await expect(withAiCapacity(secondWork)).rejects.toThrow("AI_BUSY");
      expect(secondWork).not.toHaveBeenCalled();
      release(); expect(await first).toBe("first");
      expect(await withAiCapacity(secondWork)).toBe("second");
    } finally { release?.(); if(previous===undefined)delete process.env.AI_MAX_CONCURRENCY;else process.env.AI_MAX_CONCURRENCY=previous; }
  });
});
