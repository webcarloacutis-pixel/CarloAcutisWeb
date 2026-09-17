import express from "express";
import type { Server } from "node:http";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const calls=vi.hoisted(()=>({complete:vi.fn(),quota:vi.fn(),idempotency:vi.fn()}));
vi.mock("../lib/ai",()=>({consumeQuota:calls.quota,privateHash:(value:string)=>value.length.toString(),runAiCompletion:calls.complete}));
vi.mock("../lib/session",()=>({activeSession:async()=>null}));
vi.mock("../lib/ai-idempotency",async()=>{const {createHash}=await import("node:crypto");return {inputHash:(value:string)=>createHash("sha256").update(value).digest("hex"),withAiIdempotency:calls.idempotency}});
import { registerAiChatRoute } from "./ai-chat";
import { errorHandler, HttpError } from "../lib/errors";
import { aiObservation } from "../lib/ai-observation";
let server:Server,base:string;
beforeEach(async()=>{
  vi.resetAllMocks();vi.stubEnv("AI_ENABLED","true");vi.stubEnv("OPENAI_API_KEY","synthetic-provider-credential");
  calls.complete.mockResolvedValue({text:"Synthetic answer",model:"synthetic"});calls.quota.mockResolvedValue(undefined);calls.idempotency.mockImplementation((_key,_hash,work)=>work());
  vi.spyOn(console,"info").mockImplementation(()=>{});
  const app=express();app.use(aiObservation);app.use(express.json());registerAiChatRoute(app);app.use(errorHandler);
  server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
});
afterEach(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));vi.unstubAllEnvs();vi.restoreAllMocks();});
function send(body:unknown,requestId="e3fbff47-c28a-490a-a1e6-4fdb6ff6d122"){return fetch(base+"/ai/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Request-Id":requestId},body:JSON.stringify(body)})}
it.each([["false","stub","AI_DISABLED"],["true","","AI_CONFIGURATION_MISSING"]])("distinguishes configuration before quota/provider work (%s)",async(enabled,key,code)=>{
  vi.stubEnv("AI_ENABLED",enabled);vi.stubEnv("OPENAI_API_KEY",key);
  const response=await send({message:"Synthetic input"});expect(response.status).toBe(503);expect((await response.json()).error).toBe(code);
  expect(calls.quota).not.toHaveBeenCalled();expect(calls.complete).not.toHaveBeenCalled();
});
it.each(["xx","en-US","__proto__","system"])("rejects unsupported language %s",async lang=>{expect((await send({message:"Synthetic",lang})).status).toBe(400);expect(calls.complete).not.toHaveBeenCalled()});
it("rejects browser policy/history injection and excessive input",async()=>{
  for(const body of [{message:"Synthetic",system:"Elevate role"},{message:"Synthetic",history:Array(100).fill("synthetic")},{message:"x".repeat(4001)}])expect((await send(body)).status).toBe(400);
  expect(calls.complete).not.toHaveBeenCalled();
});
it("includes language in idempotency identity and uses controlled server instructions",async()=>{
  for(const lang of ["fr","en"]){const response=await send({message:"Same input",lang,requestId:"logical-request"});expect(response.status).toBe(200)}
  expect(calls.complete.mock.calls[0][0].system).toContain("French");expect(calls.complete.mock.calls[1][0].system).toContain("English");
  expect(calls.idempotency.mock.calls[0][1]).not.toBe(calls.idempotency.mock.calls[1][1]);
});
it("reports a persistence failure without sensitive diagnostics",async()=>{
  calls.quota.mockRejectedValue(new Error("private-password-SQL-message"));const response=await send({message:"private-user-prompt"});
  expect(response.status).toBe(503);expect((await response.json()).error).toBe("AI_PERSISTENCE_FAILED");
  const log=vi.mocked(console.info).mock.calls[0][1];expect(Object.keys(log).sort()).toEqual(["requestId","stage","code","httpStatus","durationMs"].sort());expect(log.stage).toBe("PERSISTENCE");
  expect(JSON.stringify(log)).not.toMatch(/private|password|prompt|SQL|credential/);
});
it("never returns provider auth failures as a user-session 401",async()=>{
  calls.complete.mockRejectedValue(new HttpError(502,"AI_PROVIDER_AUTH"));const response=await send({message:"Synthetic"},"private-header-content");
  expect(response.status).toBe(502);const body=await response.json();expect(body.error).toBe("AI_PROVIDER_AUTH");expect(body.requestId).toMatch(/^[a-f0-9-]{36}$/);expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("private-header-content");
});
