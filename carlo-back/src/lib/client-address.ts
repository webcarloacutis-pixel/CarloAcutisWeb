import { isIP } from "node:net";
import type { Request } from "express";

/** Only bare IP literals are identities; ports, zone IDs and malformed headers are rejected. */
export function canonicalIp(value: string | undefined): string | undefined {
  if (!value || value !== value.trim() || value.includes("%")) return undefined;
  const family = isIP(value);
  if (family === 4) return value;
  if (family !== 6) return undefined;
  const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  // Node reports IPv4 sockets as mapped IPv6 on some listeners. Keep one bucket for both.
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(normalized);
  if (mapped) {
    const high = Number.parseInt(mapped[1], 16), low = Number.parseInt(mapped[2], 16);
    return [high >> 8, high & 255, low >> 8, low & 255].join(".");
  }
  return normalized;
}

export function clientAddress(req: Pick<Request, "ip" | "socket">): string {
  return canonicalIp(req.ip) ?? canonicalIp(req.socket.remoteAddress) ?? "unknown";
}

/** Enable only after verifying the ingress. Hop count alone does not authenticate a proxy. */
export function proxyTrust(env: NodeJS.ProcessEnv = process.env) {
  const rawHops = env.TRUST_PROXY_HOPS ?? "0";
  if (!/^[0-2]$/.test(rawHops)) throw new Error("TRUST_PROXY_HOPS must be 0, 1 or 2");
  const hops = Number(rawHops);
  if (hops === 0) return false;
  const raw = env.TRUSTED_PROXY_ADDRESSES?.split(",").map(value => value.trim()) ?? [];
  if (raw.length === 0 || raw.length > 16 || raw.some(value => !canonicalIp(value))) {
    throw new Error("TRUSTED_PROXY_ADDRESSES requires 1 to 16 explicit IP addresses when proxy trust is enabled");
  }
  const trusted = new Set(raw.map(value => canonicalIp(value)!));
  return (address: string, index: number) => index < hops && trusted.has(canonicalIp(address) ?? "");
}
