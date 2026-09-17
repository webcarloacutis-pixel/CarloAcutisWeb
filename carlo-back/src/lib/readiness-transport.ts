import { lookup } from "node:dns/promises";
import { createConnection, type Socket } from "node:net";
import { connect as connectTls, type TLSSocket } from "node:tls";

export function resolveDatabaseHost(host: string) { return lookup(host, { all: true }); }

export function connectDatabaseTcp(host: string, port: number, timeoutMs = 5000): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    let finished = false;
    const timer = setTimeout(() => finish(Object.assign(new Error(), { code: "ETIMEDOUT" })), timeoutMs);
    function finish(error?: Error) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket.removeListener("connect", connected);
      socket.removeListener("error", failed);
      if (error) { socket.destroy(); reject(error); } else resolve(socket);
    }
    const connected = () => finish();
    const failed = (error: Error) => finish(error);
    // A delayed error after destroy must never become an uncaught exception or raw log.
    socket.on("error", () => {});
    socket.once("connect", connected);
    socket.once("error", failed);
  });
}

export type TlsProbeResult = { authorized: boolean; hostnameVerified: boolean; protocol: string | null };

// PostgreSQL requires SSLRequest and a single-byte S before a TLS ClientHello.
// No credentials or PostgreSQL startup/authentication packet are sent by this probe.
export function probePostgresTls(socket: Socket, host: string, ca: Buffer, timeoutMs = 7000): Promise<TlsProbeResult> {
  return new Promise((resolve, reject) => {
    let secure: TLSSocket | undefined;
    let finished = false;
    const timer = setTimeout(() => finish(Object.assign(new Error(), { code: "ETIMEDOUT" })), timeoutMs);
    function finish(error?: Error, result?: TlsProbeResult) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket.removeListener("data", upgrade);
      socket.removeListener("error", failed);
      socket.removeListener("close", closed);
      secure?.destroy();
      socket.destroy();
      if (error) reject(error); else resolve(result!);
    }
    const failed = (error: Error) => finish(error);
    const closed = () => finish(Object.assign(new Error(), { code: "ECONNRESET" }));
    function upgrade(reply: Buffer) {
      if (reply.length !== 1 || reply[0] !== 0x53) {
        finish(Object.assign(new Error(), { code: "POSTGRES_SSL_REFUSED" }));
        return;
      }
      socket.pause();
      try {
        // Default Node checkServerIdentity performs hostname verification using servername.
        secure = connectTls({ socket, servername: host, ca, rejectUnauthorized: true });
        secure.on("error", failed);
        secure.once("secureConnect", () => {
          if (!secure!.authorized) {
            finish(Object.assign(new Error(), { code: "TLS_UNAUTHORIZED" }));
            return;
          }
          const protocol = secure!.getProtocol();
          finish(undefined, { authorized: true, hostnameVerified: true,
            protocol: protocol === "TLSv1.2" || protocol === "TLSv1.3" ? protocol : null });
        });
      } catch (error) { finish(error instanceof Error ? error : new Error()); }
    }
    socket.once("data", upgrade);
    socket.once("error", failed);
    socket.once("close", closed);
    const request = Buffer.alloc(8);
    request.writeInt32BE(8, 0);
    request.writeInt32BE(80877103, 4);
    socket.write(request);
  });
}
