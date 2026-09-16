import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalIp, clientAddress, proxyTrust } from "./client-address";
import { rateLimit } from "./rate-limit";

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))));
});
async function server(env: NodeJS.ProcessEnv) {
  const app = express();
  app.set("trust proxy", proxyTrust(env));
  app.use(["/limit", "/api/limit"], rateLimit(2, 60000), (req, res) => res.json({address:clientAddress(req)}));
  const listener = app.listen(0, "127.0.0.1"); servers.push(listener);
  await new Promise<void>(resolve => listener.once("listening", resolve));
  const base = "http://127.0.0.1:"+(listener.address() as {port:number}).port;
  return async (forwarded: string, path = "/limit") => {
    const response = await fetch(base+path, {headers:{"X-Forwarded-For":forwarded,"X-Real-IP":"203.0.113.99",Forwarded:"for=203.0.113.98"}});
    return {status:response.status, body:await response.json() as {address?:string,error?:string}};
  };
}
describe("canonical client identity", () => {
  it("normalizes equivalent IPv6 and IPv4-mapped IPv6", () => {
    expect(canonicalIp("2001:0DB8:0000:0000:0000:0000:0000:0001")).toBe("2001:db8::1");
    for (const ip of ["192.0.2.1","::ffff:192.0.2.1","0:0:0:0:0:ffff:c000:201"]) expect(canonicalIp(ip)).toBe("192.0.2.1");
  });
  it("rejects invalid IPs, ports and zone identifiers", () => {
    for (const ip of [undefined,"","face","999.1.1.1","01.2.3.4","192.0.2.1:80","[::1]","fe80::1%lo"," ::1","::::"]) expect(canonicalIp(ip)).toBeUndefined();
  });
  it("fails closed when enabled without exact verified peer IPs", () => {
    expect(proxyTrust({TRUST_PROXY_HOPS:"0"})).toBe(false);
    for (const env of [{TRUST_PROXY_HOPS:"true"},{TRUST_PROXY_HOPS:"1"},{TRUST_PROXY_HOPS:"1",TRUSTED_PROXY_ADDRESSES:"loopback"},{TRUST_PROXY_HOPS:"1",TRUSTED_PROXY_ADDRESSES:"10.0.0.0/8"},{TRUST_PROXY_HOPS:"1",TRUSTED_PROXY_ADDRESSES:"127.0.0.1,"}]) expect(() => proxyTrust(env)).toThrow();
  });
  it("combines peer allowlist with maximum hops", () => {
    const trust=proxyTrust({TRUST_PROXY_HOPS:"2",TRUSTED_PROXY_ADDRESSES:"127.0.0.1,10.1.2.3"});
    expect(typeof trust).toBe("function");
    if (!trust) throw new Error("Expected trust function");
    expect(trust("::ffff:127.0.0.1",0)).toBe(true);
    expect(trust("10.1.2.3",1)).toBe(true);
    expect(trust("10.1.2.3",2)).toBe(false);
    expect(trust("203.0.113.1",0)).toBe(false);
  });
});
describe("HTTP proxy-chain simulation with the production limiter", () => {
  it("default identity ignores spoofed and rotating headers across aliases", async () => {
    const call=await server({TRUST_PROXY_HOPS:"0"});
    expect((await call("192.0.2.1")).body.address).toBe("127.0.0.1");
    expect((await call("198.51.100.1","/api/limit")).status).toBe(200);
    expect((await call("2001:db8::2")).status).toBe(429);
  });
  it("distinguishes legitimate clients only behind the explicitly trusted peer", async () => {
    const call=await server({TRUST_PROXY_HOPS:"1",TRUSTED_PROXY_ADDRESSES:"127.0.0.1"});
    expect((await call("192.0.2.1")).body.address).toBe("192.0.2.1");
    expect((await call("198.51.100.1")).body.address).toBe("198.51.100.1");
    expect((await call("192.0.2.1")).status).toBe(200);
    expect((await call("spoofed,192.0.2.1","/api/limit")).status).toBe(429);
    expect((await call("198.51.100.1")).status).toBe(200);
  });
  it("cannot bypass the same IP bucket with equivalent IPv6 spellings", async () => {
    const call=await server({TRUST_PROXY_HOPS:"1",TRUSTED_PROXY_ADDRESSES:"127.0.0.1"});
    expect((await call("2001:db8::1")).status).toBe(200);
    expect((await call("2001:0DB8:0:0:0:0:0:1")).status).toBe(200);
    expect((await call("2001:0db8:0000:0000:0000:0000:0000:0001")).status).toBe(429);
  });
  it("cannot bypass the same IPv4 bucket with mapped IPv6 spellings", async () => {
    const call=await server({TRUST_PROXY_HOPS:"1",TRUSTED_PROXY_ADDRESSES:"127.0.0.1"});
    expect((await call("192.0.2.1")).status).toBe(200);
    expect((await call("::ffff:192.0.2.1")).status).toBe(200);
    expect((await call("0:0:0:0:0:ffff:c000:201")).status).toBe(429);
  });
  it("falls back to the socket identity for malformed final hops", async () => {
    const call=await server({TRUST_PROXY_HOPS:"1",TRUSTED_PROXY_ADDRESSES:"127.0.0.1"});
    expect((await call("192.0.2.1,face")).body.address).toBe("127.0.0.1");
    expect((await call("999.1.2.3")).status).toBe(200);
    expect((await call("192.0.2.1:1234")).status).toBe(429);
  });
  it("ignores all forwarding on an untrusted direct route", async () => {
    const call=await server({TRUST_PROXY_HOPS:"1",TRUSTED_PROXY_ADDRESSES:"10.1.2.3"});
    expect((await call("192.0.2.1")).body.address).toBe("127.0.0.1");
    expect((await call("198.51.100.1")).status).toBe(200);
    expect((await call("203.0.113.1")).status).toBe(429);
  });
  it("walks multiple hops right to left and stops at the first untrusted peer", async () => {
    const call=await server({TRUST_PROXY_HOPS:"2",TRUSTED_PROXY_ADDRESSES:"127.0.0.1,10.1.2.3"});
    expect((await call("203.0.113.99,192.0.2.1,10.1.2.3")).body.address).toBe("192.0.2.1");
    expect((await call("203.0.113.98,192.0.2.1,10.1.2.3")).status).toBe(200);
    expect((await call("203.0.113.97,192.0.2.1,10.1.2.3")).status).toBe(429);
    expect((await call("192.0.2.1,10.1.2.4")).body.address).toBe("10.1.2.4");
  });
});
