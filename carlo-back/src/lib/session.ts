import jwt, { type JwtPayload } from "jsonwebtoken";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request, RequestHandler, Response } from "express";
import { prisma } from "./prisma";
import { HttpError } from "./errors";
export const USER_COOKIE = "carlo_token";
export const ADMIN_COOKIE = "carlo_admin";
const issuer = "carlo-acutis-api";
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new HttpError(503, "AUTH_NOT_CONFIGURED");
  return value;
}
export function constantEqual(a: string, b: string) {
  const first = createHash("sha256").update(a).digest();
  const second = createHash("sha256").update(b).digest();
  return timingSafeEqual(first, second);
}
export function cookieOptions(): CookieOptions {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" };
}
export async function setSession(res: Response, kind: "user" | "admin", uid?: string) {
  const admin = kind === "admin";
  const keyVersion = admin ? createHash("sha256").update(process.env.ADMIN_KEY || "").digest("hex") : undefined;
  const sessionId = randomUUID();
  const duration = (admin ? 8 * 60 * 60 : 7 * 24 * 60 * 60) * 1000;
  await prisma.authSession.create({ data: { id: sessionId, kind, userId: uid ?? null, expiresAt: new Date(Date.now() + duration) } });
  const token = jwt.sign({ kind, jti: sessionId, ...(uid ? { uid } : {}), ...(keyVersion ? { keyVersion } : {}) }, secret(), {
    algorithm: "HS256", issuer, audience: "carlo-web", expiresIn: admin ? "8h" : "7d",
  });
  res.cookie(admin ? ADMIN_COOKIE : USER_COOKIE, token, { ...cookieOptions(), maxAge: (admin ? 8 * 60 * 60 : 7 * 24 * 60 * 60) * 1000 });
}
export function readSession(req: Request, kind: "user" | "admin"): JwtPayload | null {
  const token: unknown = req.cookies?.[kind === "admin" ? ADMIN_COOKIE : USER_COOKIE];
  if (typeof token !== "string" || token.length > 4096) return null;
  try {
    const payload = jwt.verify(token, secret(), { algorithms: ["HS256"], issuer, audience: "carlo-web" });
    if (typeof payload === "string" || payload.kind !== kind || typeof payload.jti !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(payload.jti)) return null;
    if (kind === "user" && (typeof payload.uid !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(payload.uid))) return null;
    if (kind === "admin") {
      const key = process.env.ADMIN_KEY;
      if (!key || typeof payload.keyVersion !== "string" || !constantEqual(payload.keyVersion, createHash("sha256").update(key).digest("hex"))) return null;
    }
    return payload;
  } catch { return null; }
}
export async function activeSession(req: Request, kind: "user" | "admin") {
  const payload = readSession(req, kind);
  if (!payload) return null;
  const session = await prisma.authSession.findUnique({ where: { id: payload.jti } });
  if (!session || session.kind !== kind || session.expiresAt.getTime() <= Date.now() || (kind === "user" && session.userId !== payload.uid)) return null;
  return payload;
}
export async function revokeSession(req: Request, kind: "user" | "admin") {
  const payload = readSession(req, kind);
  if (payload) await prisma.authSession.deleteMany({ where: { id: payload.jti, kind } });
}
export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await activeSession(req, "user");
  if (!session) { res.status(401).json({ error: "NOT_AUTHENTICATED" }); return; }
  const user = await prisma.user.findUnique({ where: { id: session.uid }, select: { id: true } });
  if (!user) { res.status(401).json({ error: "NOT_AUTHENTICATED" }); return; }
  res.locals.userId = user.id;
  next();
};
