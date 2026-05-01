import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const COOKIE_NAME = "carlo_token";

function getToken(req: any) {
  return req.cookies?.[COOKIE_NAME];
}

function setAuthCookie(res: any, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const normalizedEmail = String(email).toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exists) return res.status(409).json({ error: "email already exists" });

  const passwordHash = await bcrypt.hash(String(password), 10);

  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash, name: name ? String(name) : null },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: "30d" });
  setAuthCookie(res, token);

  res.json({ user });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: "30d" });
  setAuthCookie(res, token);

  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

router.get("/me", async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ error: "not authenticated" });
    res.json({ user });
  } catch {
    res.status(401).json({ error: "not authenticated" });
  }
});

router.post("/logout", async (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

export default router;
