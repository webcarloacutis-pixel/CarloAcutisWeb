import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { ADMIN_COOKIE, USER_COOKIE, activeSession, constantEqual, cookieOptions, revokeSession, requireAuth, setSession } from "../lib/session";
import { objectBody, text } from "../lib/validation";
import { HttpError } from "../lib/errors";
const router = Router();
function credentials(body: Record<string, unknown>, registering = false) {
  const email = text(body.email, 254, true)!.toLowerCase();
  const password = text(body.password, 200, true, true)!;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || Buffer.byteLength(password, "utf8") > 72 || (registering && password.length < 12)) throw new HttpError(400, "INVALID_CREDENTIALS_FORMAT");
  return { email, password };
}
const publicUser = { id: true, email: true, name: true, createdAt: true } as const;
router.post("/register", async (req, res) => {
  const body = objectBody(req.body, ["email", "password", "name"]);
  const { email, password } = credentials(body, true);
  const name = text(body.name, 100);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, name }, select: publicUser });
  await setSession(res, "user", user.id);
  res.status(201).json({ user });
});
router.post("/login", async (req, res) => {
  const body = objectBody(req.body, ["email", "password"]);
  const { email, password } = credentials(body);
  const user = await prisma.user.findUnique({ where: { email } });
  // A valid fixed dummy hash keeps password work on unknown-account requests.
  const dummy = "$2b$12$C6UzMDM.H6dfI/f/IKxGhuYNTCYjuTWYDvfdZZKVUFxaISAbJi6G6";
  const matches = await bcrypt.compare(password, user?.passwordHash ?? dummy);
  if (!user || !matches) throw new HttpError(401, "INVALID_CREDENTIALS");
  await setSession(res, "user", user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});
router.get("/me", requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { id: res.locals.userId }, select: publicUser });
  res.json({ user });
});
router.post("/logout", async (req, res) => {
  await revokeSession(req, "user");
  res.clearCookie(USER_COOKIE, cookieOptions());
  res.json({ ok: true });
});
router.post("/admin/login", async (req, res) => {
  const body = objectBody(req.body, ["password"]);
  const password = text(body.password, 512, true, true)!;
  const expected = process.env.ADMIN_KEY;
  if (!expected || expected.length < 32) throw new HttpError(503, "ADMIN_NOT_CONFIGURED");
  if (!constantEqual(password, expected)) throw new HttpError(401, "INVALID_CREDENTIALS");
  await setSession(res, "admin");
  res.json({ authenticated: true });
});
router.get("/admin/me", async (req, res) => {
  if (!await activeSession(req, "admin")) throw new HttpError(401, "NOT_AUTHENTICATED");
  res.json({ authenticated: true });
});
router.post("/admin/logout", async (req, res) => {
  await revokeSession(req, "admin");
  res.clearCookie(ADMIN_COOKIE, cookieOptions());
  res.json({ ok: true });
});
export default router;
