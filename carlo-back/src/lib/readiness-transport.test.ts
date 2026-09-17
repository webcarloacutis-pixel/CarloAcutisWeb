import { createServer, type Server, type Socket } from "node:net";
import { createSecureContext, TLSSocket } from "node:tls";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectDatabaseTcp, probePostgresTls } from "./readiness-transport";
import { temporaryTestCertificate } from "./readiness-test-certificate";

let fixture: ReturnType<typeof temporaryTestCertificate>;
beforeAll(() => { fixture = temporaryTestCertificate(); });
afterAll(() => fixture?.cleanup());
async function fakePostgres(mode: "tls" | "silent" | "refuse") {
  const sockets = new Set<Socket>();
  const requests: Buffer[] = [];
  const server = createServer(socket => {
    sockets.add(socket);socket.on("error", () => {});socket.on("close", () => sockets.delete(socket));
    socket.once("data", request => {
      requests.push(request);
      if (mode === "silent") return;
      if (mode === "refuse") { socket.end("N");return; }
      socket.write("S");
      const secure = new TLSSocket(socket, { isServer: true, secureContext: createSecureContext({ key: fixture.key, cert: fixture.certificate }) });
      secure.on("error", () => {});sockets.add(secure);secure.on("close", () => sockets.delete(secure));
    });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  return { port, requests, async close() { for (const socket of sockets) socket.destroy();await new Promise<void>(resolve => server.close(() => resolve())); } };
}
describe("PostgreSQL wire TLS probe against an isolated local server", () => {
  it("sends SSLRequest before TLS and verifies a matching hostname", async () => {
    const server = await fakePostgres("tls");
    try {
      const socket = await connectDatabaseTcp("127.0.0.1", server.port, 1000);
      expect(await probePostgresTls(socket, "localhost", fixture.certificate, 1500)).toMatchObject({ authorized: true, hostnameVerified: true });
      expect(server.requests).toHaveLength(1);expect(server.requests[0].length).toBe(8);
      expect(server.requests[0].readInt32BE(4)).toBe(80877103);expect(socket.destroyed).toBe(true);
    } finally { await server.close(); }
  });
  it("rejects a wrong hostname with verification enabled", async () => {
    const server = await fakePostgres("tls");
    try {
      const socket = await connectDatabaseTcp("127.0.0.1", server.port, 1000);
      await expect(probePostgresTls(socket, "wrong.example.invalid", fixture.certificate, 1500)).rejects.toMatchObject({ code: "ERR_TLS_CERT_ALTNAME_INVALID" });
      expect(socket.destroyed).toBe(true);
    } finally { await server.close(); }
  });
  it("times out and closes a socket when the server does not answer SSLRequest", async () => {
    const server = await fakePostgres("silent");
    try {
      const socket = await connectDatabaseTcp("127.0.0.1", server.port, 1000);
      await expect(probePostgresTls(socket, "localhost", fixture.certificate, 100)).rejects.toMatchObject({ code: "ETIMEDOUT" });
      expect(socket.destroyed).toBe(true);
    } finally { await server.close(); }
  });
  it("never falls back to plaintext when PostgreSQL refuses TLS", async () => {
    const server = await fakePostgres("refuse");
    try {
      const socket = await connectDatabaseTcp("127.0.0.1", server.port, 1000);
      await expect(probePostgresTls(socket, "localhost", fixture.certificate, 1000)).rejects.toMatchObject({ code: "POSTGRES_SSL_REFUSED" });
    } finally { await server.close(); }
  });
  it("reports TCP connection refusal with a closed local port", async () => {
    const server: Server = createServer();await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;await new Promise<void>(resolve => server.close(() => resolve()));
    await expect(connectDatabaseTcp("127.0.0.1", port, 1000)).rejects.toMatchObject({ code: "ECONNREFUSED" });
  });
});
