import { beforeEach, expect, it, vi } from "vitest";
const queries=vi.hoisted(()=>({find:vi.fn(),claim:vi.fn(),save:vi.fn()}));
vi.mock("./prisma",()=>({prisma:{aiRequest:{findUnique:queries.find,updateMany:queries.save},$queryRaw:queries.claim}}));
import { withAiIdempotency } from "./ai-idempotency";
beforeEach(()=>{vi.resetAllMocks();queries.find.mockResolvedValue(null);queries.claim.mockResolvedValue([{id:"synthetic"}]);queries.save.mockResolvedValue({count:1});});
it("returns completed work without claiming or repeating generation",async()=>{
  queries.find.mockResolvedValue({inputHash:"same",response:"complete",model:"stub",expiresAt:new Date(Date.now()+10000)});const work=vi.fn();
  expect(await withAiIdempotency("synthetic","same",work)).toEqual({text:"complete",model:"stub"});expect(work).not.toHaveBeenCalled();expect(queries.claim).not.toHaveBeenCalled();
});
it("does not return an expired completed response after a lost renewal race",async()=>{
  queries.find.mockResolvedValue({inputHash:"same",response:"expired",model:"stub",expiresAt:new Date(0)});queries.claim.mockResolvedValue([]);const work=vi.fn();
  await expect(withAiIdempotency("synthetic","same",work)).rejects.toThrow("AI_REQUEST_IN_PROGRESS");expect(work).not.toHaveBeenCalled();
});
it("renews expired results through an atomic conditional claim before generating",async()=>{
  queries.find.mockResolvedValue({inputHash:"same",response:"expired",model:"stub",expiresAt:new Date(0)});const work=vi.fn().mockResolvedValue({text:"fresh",model:"stub"});
  expect(await withAiIdempotency("synthetic","same",work)).toEqual({text:"fresh",model:"stub"});expect(work).toHaveBeenCalledOnce();
  expect(queries.claim.mock.calls[0][0].join("?")).toContain('"expiresAt" <=');
});
