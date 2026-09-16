import type { NextFunction, Request, Response } from "express";
import { activeSession, constantEqual } from "./session";
export async function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_KEY;
  if (!expected || expected.length < 32) return res.status(503).json({ error: "ADMIN_NOT_CONFIGURED" });
  const provided = req.header("x-admin-key");
  if ((provided && provided.length <= 512 && constantEqual(provided, expected)) || await activeSession(req, "admin")) return next();
  return res.status(401).json({ error: "UNAUTHORIZED" });
}
