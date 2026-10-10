import { afterEach, expect, it, vi } from "vitest";
import express from "express";
import { randomUUID } from "node:crypto";
import { aiObservation } from "./ai-observation";
import { errorHandler, HttpError } from "./errors";
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

function mountedFixture(onCancel?:()=>void) {
  const app=express();app.use(aiObservation);app.use(express.json());
  const auth=express.Router();
  auth.post('/login',()=>{throw new HttpError(401,'NOT_AUTHENTICATED');});
  auth.post('/admin/login',()=>{throw new HttpError(401,'NOT_AUTHENTICATED');});
  app.use(['/auth','/api/auth'],auth);
  const conversations=express.Router();
  conversations.post('/:id/messages',()=>{throw new HttpError(404,'NOT_FOUND');});
  conversations.post('/',()=>{throw new HttpError(404,'NOT_FOUND');});
  app.use(['/conversations','/api/conversations'],conversations);
  const ai=express.Router();
  ai.post('/chat',(req,res)=>{
    if(req.body.fixtureOutcome==='quota'){res.locals.aiStage='PROVIDER';throw new HttpError(429,'AI_QUOTA_EXCEEDED');}
    if(req.body.fixtureOutcome==='configuration'){res.locals.aiStage='CONFIGURATION';throw new HttpError(503,'AI_CONFIGURATION_MISSING');}
    res.locals.aiStage='COMPLETE';res.json({ok:true});
  });
  ai.post('/:id',(_req,res)=>{res.locals.aiStage='PROVIDER';onCancel?.();});
  app.use(['/ai','/api/ai'],ai);
  app.post('/authentic/:id',()=>{throw new HttpError(400,'INVALID_INPUT');});
  app.use((_req,_res,next)=>next(new HttpError(404,'NOT_FOUND')));
  app.use(errorHandler);
  return app;
}
it.each([
  ['/auth/login','/auth/login',401,'API_REQUEST','EXPRESS','AUTHENTICATION','error'],
  ['/api/auth/login','/api/auth/login',401,'API_REQUEST','EXPRESS','AUTHENTICATION','error'],
  ['/auth/admin/login','/auth/admin/login',401,'API_REQUEST','EXPRESS','AUTHENTICATION','error'],
  ['/api/auth/admin/login','/api/auth/admin/login',401,'API_REQUEST','EXPRESS','AUTHENTICATION','error'],
  ['/conversations/synthetic-private-id/messages?cursor=synthetic-private-query','/conversations/:id/messages',404,'API_REQUEST','EXPRESS','APPLICATION','error'],
  ['/api/conversations/synthetic-private-id/messages?cursor=synthetic-private-query','/api/conversations/:id/messages',404,'API_REQUEST','EXPRESS','APPLICATION','error'],
  ['/conversations','/conversations/',404,'API_REQUEST','EXPRESS','APPLICATION','error'],
  ['/api/conversations','/api/conversations/',404,'API_REQUEST','EXPRESS','APPLICATION','error'],
  ['/ai/chat','/ai/chat',429,'AI_REQUEST','PROVIDER','PROVIDER_QUOTA','quota'],
  ['/api/ai/chat','/api/ai/chat',503,'AI_REQUEST','CONFIGURATION','CONFIGURATION','configuration'],
  ['/api/ai/chat','/api/ai/chat',200,'AI_REQUEST','COMPLETE','SUCCESS','ok'],
] as const)('retains canonical mounted route %s after real Express completion',async(path,route,status,label,stage,category,fixtureOutcome)=>{
  const log=vi.spyOn(console,'info').mockImplementation(()=>{});
  const requestId=randomUUID();const server=mountedFixture().listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  try {
    const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Request-Id':requestId},body:JSON.stringify({fixtureOutcome,privateBody:'synthetic-private-body'})});
    expect(response.status).toBe(status);await response.json();
    expect(response.headers.get('x-request-id')).toBe(requestId);
    await vi.waitFor(()=>expect(log).toHaveBeenCalledOnce());
    expect(log.mock.calls[0]).toEqual([label,expect.objectContaining({route,method:'POST',requestId,stage,category,httpStatus:status,outcome:'COMPLETED'})]);
    const serialized=JSON.stringify(log.mock.calls);
    for(const sensitive of ['synthetic-private-id','synthetic-private-query','synthetic-private-body','cursor='])expect(serialized).not.toContain(sensitive);
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
it.each([['/authentic/synthetic-private-id?secret=synthetic-private-query','/authentic/:id',400],['/unknown/synthetic-private-id?secret=synthetic-private-query','UNMATCHED',404]] as const)(
  'does not infer a mount from an unrelated or unmatched path %s',async(path,route,status)=>{
    const log=vi.spyOn(console,'info').mockImplementation(()=>{});const server=mountedFixture().listen(0,'127.0.0.1');
    await new Promise<void>(resolve=>server.once('listening',resolve));
    const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
    try {
      const response=await fetch(base+path,{method:'POST'});expect(response.status).toBe(status);await response.json();
      await vi.waitFor(()=>expect(log).toHaveBeenCalledOnce());
      expect(log.mock.calls[0]).toEqual(['API_REQUEST',expect.objectContaining({route,stage:'EXPRESS',httpStatus:status})]);
      expect(JSON.stringify(log.mock.calls)).not.toMatch(/synthetic-private|secret=/);
    } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  },
);
it('correlates a mounted AI cancellation once with its pattern and provider stage',async()=>{
  const log=vi.spyOn(console,'info').mockImplementation(()=>{});
  let entered!:()=>void;const enteredRoute=new Promise<void>(resolve=>{entered=resolve;});
  const server=mountedFixture(entered).listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const controller=new AbortController(),requestId=randomUUID();
  try {
    const response=fetch(base+'/api/ai/synthetic-private-id?token=synthetic-private-query',{method:'POST',headers:{'X-Request-Id':requestId},signal:controller.signal});
    const aborted=expect(response).rejects.toMatchObject({name:'AbortError'});
    await enteredRoute;controller.abort();await aborted;
    await vi.waitFor(()=>expect(log).toHaveBeenCalledOnce());
    expect(log.mock.calls[0]).toEqual(['AI_REQUEST',expect.objectContaining({route:'/api/ai/:id',requestId,stage:'PROVIDER',outcome:'CLIENT_CANCELLED',code:'CLIENT_CANCELLED',httpStatus:null})]);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/synthetic-private|token=/);
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
