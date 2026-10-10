import { afterEach, expect, it, vi } from "vitest";
import express from "express";
import { aiObservation } from "./ai-observation";
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
function observe(code:string,stage:string,status=429){
  const log=vi.spyOn(console,"info").mockImplementation(()=>{});const events:Record<string,()=>void>={};
  const response={locals:{} as Record<string,unknown>,statusCode:status,set:vi.fn(),once:(event:string,callback:()=>void)=>{events[event]=callback}};
  aiObservation({get:()=>undefined,path:"/api/ai/chat",method:"POST",baseUrl:"",route:{path:"/api/ai/chat"}} as never,response as never,vi.fn());
  response.locals.aiCode=code;response.locals.aiStage=stage;events.finish();return log.mock.calls[0][1];
}
it.each([["RATE_LIMITED","VALIDATION","LOCAL_RATE_LIMIT"],["AI_RATE_LIMIT","PROVIDER","PROVIDER_RATE_LIMIT"],["AI_QUOTA_EXCEEDED","PERSISTENCE","LOCAL_QUOTA"],["AI_QUOTA_EXCEEDED","PROVIDER","PROVIDER_QUOTA"],["AI_DISABLED","CONFIGURATION","CONFIGURATION"],["AI_PERSISTENCE_FAILED","PERSISTENCE","DATABASE"]])("distinguishes %s at %s",(code,stage,category)=>{
  const report=observe(code,stage);expect(report).toMatchObject({code,stage,category,method:"POST",route:"/api/ai/chat"});expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});
it("does not log arbitrary revision text",()=>{
  vi.stubEnv("RENDER_GIT_COMMIT","private-untrusted-revision");const report=observe("AI_DISABLED","CONFIGURATION",503);expect(report.revision).toBeNull();expect(JSON.stringify(report)).not.toContain("private");
});
it("logs one premature close without claiming an HTTP error was delivered",()=>{
  const log=vi.spyOn(console,"info").mockImplementation(()=>{});const events:Record<string,()=>void>={};
  const response={locals:{aiStage:"PROVIDER"} as Record<string,unknown>,statusCode:504,set:vi.fn(),once:(event:string,callback:()=>void)=>{events[event]=callback}};
  aiObservation({get:()=>undefined,path:"/ai/chat",method:"POST",route:{path:"/ai/chat"}} as never,response as never,vi.fn());
  response.locals.aiStage="PROVIDER";events.close();events.finish();
  expect(log).toHaveBeenCalledOnce();expect(log.mock.calls[0][1]).toMatchObject({outcome:"CLIENT_CANCELLED",code:"CLIENT_CANCELLED",category:"CLIENT_CANCELLED",stage:"PROVIDER",httpStatus:null});
});
it("does not duplicate a completed response when close follows finish",()=>{
  const log=vi.spyOn(console,"info").mockImplementation(()=>{});const events:Record<string,()=>void>={};
  const response={locals:{} as Record<string,unknown>,statusCode:200,set:vi.fn(),once:(event:string,callback:()=>void)=>{events[event]=callback}};
  aiObservation({get:()=>undefined,path:"/health",method:"GET",route:{path:"/health"}} as never,response as never,vi.fn());events.finish();events.close();
  expect(log).toHaveBeenCalledOnce();expect(log.mock.calls[0][1]).toMatchObject({outcome:"COMPLETED",httpStatus:200,code:"OK"});
});
it("records a real loopback client disconnect before a response finishes",async()=>{
  const log=vi.spyOn(console,"info").mockImplementation(()=>{});
  let entered!:()=>void;const started=new Promise<void>(resolve=>{entered=resolve;});
  const app=express();app.use(aiObservation);app.post("/ai/cancel-observation-fixture",(_req,res)=>{res.locals.aiStage="PROVIDER";entered();});
  const server=app.listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const controller=new AbortController();
  try {
    const request=fetch(base+"/ai/cancel-observation-fixture",{method:"POST",signal:controller.signal});
    const aborted=expect(request).rejects.toMatchObject({name:"AbortError"});
    await started;controller.abort();await aborted;
    await vi.waitFor(()=>expect(log).toHaveBeenCalledOnce());
    expect(log.mock.calls[0]).toEqual(["AI_REQUEST",expect.objectContaining({outcome:"CLIENT_CANCELLED",httpStatus:null,stage:"PROVIDER",code:"CLIENT_CANCELLED"})]);
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
