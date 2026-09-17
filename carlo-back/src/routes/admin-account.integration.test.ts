import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Server } from "node:http";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { integrationDatabaseEnabled } from "../lib/test-database";
import { provisionAdminAccount } from "../maintenance/admin-account";

describe.runIf(integrationDatabaseEnabled())("real account administrator authorization on disposable PostgreSQL",()=>{
  const suffix=randomUUID(), email=`admin-${suffix}@example.invalid`, ordinary=`ordinary-${suffix}@example.invalid`;
  const password="Synthetic-only-password.";
  let server:Server,base:string,adminId:string,ordinaryId:string;
  const originalKey=process.env.ADMIN_KEY;
  async function call(path:string,body?:unknown,cookie?:string,method?:string){
    return fetch(base+path,{method:method??(body===undefined?"GET":"POST"),headers:{"Content-Type":"application/json",Origin:process.env.FRONTEND_ORIGIN!,...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  }
  const cookie=(response:Response)=>response.headers.getSetCookie().map(x=>x.split(";")[0]).join("; ");
  beforeAll(async()=>{
    const plan=await provisionAdminAccount(prisma,{email,password});expect(plan.action).toBe("CREATE");
    const result=await provisionAdminAccount(prisma,{email,password,execute:true,expectedUserId:null},async()=>{});
    adminId=result.userId!;
    ordinaryId=(await prisma.user.create({data:{email:ordinary,passwordHash:await bcrypt.hash(password,12)}})).id;
  });
  beforeEach(async()=>{
    if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));
    process.env.ADMIN_KEY=originalKey;
    server=createApp().listen(0,"127.0.0.1");await new Promise<void>(resolve=>server.once("listening",resolve));
    base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  });
  afterAll(async()=>{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));await prisma.user.deleteMany({where:{email:{in:[email,ordinary]}}});process.env.ADMIN_KEY=originalKey;await prisma.$disconnect();});
  it("logs in by normalized email with an admin account, reloads, and revokes on logout",async()=>{
    delete process.env.ADMIN_KEY;
    const login=await call("/auth/admin/login",{email:` ${email.toUpperCase()} `,password});expect(login.status).toBe(200);
    const session=cookie(login);expect(session).toContain("carlo_admin=");expect(login.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect((await call("/auth/admin/me",undefined,session)).status).toBe(200);
    expect((await call("/api/auth/admin/me",undefined,session)).status).toBe(200);
    expect((await call("/auth/admin/logout",{},session)).status).toBe(200);
    expect((await call("/auth/admin/me",undefined,session)).status).toBe(401);
  });
  it.each(["/saints","/api/saints","/prayers","/api/prayers","/miracles/all","/api/miracles/all"])("rejects visitors and ordinary users on %s",async path=>{
    const body=path.endsWith("/all")?undefined:{};
    expect((await call(path,body)).status).toBe(401);
    const login=await call("/auth/login",{email:ordinary,password});expect(login.status).toBe(200);
    expect((await call(path,body,cookie(login))).status).toBe(401);
    const admin=await call("/auth/admin/login",{email,password});expect(admin.status).toBe(200);
    expect((await call(path,body,cookie(admin))).status).toBe(body===undefined?200:400); // Empty writes fail validation; admin reads succeed.
  });
  it.each(["/miracles/missing","/api/miracles/missing"])("protects miracle write alias %s",async path=>{
    expect((await call(path,{title:"Synthetic"},undefined,"PATCH")).status).toBe(401);
    const ordinarySession=cookie(await call("/auth/login",{email:ordinary,password}));
    expect((await call(path,{title:"Synthetic"},ordinarySession,"PATCH")).status).toBe(401);
    const adminSession=cookie(await call("/auth/admin/login",{email,password}));
    expect((await call(path,{title:"Synthetic"},adminSession,"PATCH")).status).toBe(404);
  });
  it("does not grant permission to a normal account or accept a client role",async()=>{
    expect((await call("/auth/admin/login",{email:ordinary,password})).status).toBe(401);
    expect((await call("/auth/admin/login",{email,password:password.slice(0,-1)})).status).toBe(401);
    expect((await call("/auth/register",{email:"assignment@example.invalid",password,isAdmin:true})).status).toBe(400);
    expect((await call("/auth/register",{email:"assignment@example.invalid",password,role:"admin"})).status).toBe(400);
    expect((await prisma.user.findUnique({where:{id:ordinaryId}}))?.isAdmin).toBe(false);
  });
  it("checks revoked permission against the database on every request",async()=>{
    const session=cookie(await call("/auth/admin/login",{email,password}));
    await prisma.user.update({where:{id:adminId},data:{isAdmin:false}});
    try{expect((await call("/auth/admin/me",undefined,session)).status).toBe(401);expect((await call("/saints",{},session)).status).toBe(401);}
    finally{await prisma.user.update({where:{id:adminId},data:{isAdmin:true}});}
  });
  it("provisions idempotently and preserves ID/history while revoking sessions on password change",async()=>{
    const unchanged=await provisionAdminAccount(prisma,{email,password,execute:true,expectedUserId:adminId},async()=>{throw new Error("Unexpected backup for unchanged account");});expect(unchanged.action).toBe("UNCHANGED");
    const conversation=await prisma.conversation.create({data:{userId:ordinaryId,title:"Synthetic preserved history",messages:{create:{role:"user",content:"Synthetic original"}}}});
    await call("/auth/login",{email:ordinary,password});
    let backedUp=false;
    const updated=await provisionAdminAccount(prisma,{email:ordinary,password:"Different-synthetic-password.",execute:true,expectedUserId:ordinaryId},async()=>{backedUp=true;});
    expect(backedUp).toBe(true);expect(updated.action).toBe("UPDATE");expect(updated.userId).toBe(ordinaryId);expect(updated.sessionsRevoked).toBeGreaterThan(0);
    expect(await prisma.message.count({where:{conversationId:conversation.id}})).toBe(1);
    expect(await prisma.authSession.count({where:{userId:ordinaryId}})).toBe(0);
  });
});
