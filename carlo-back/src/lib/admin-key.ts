import type { NextFunction, Request, Response } from "express";

export function requireAdminKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const expected = process.env.ADMIN_KEY;

  if (!expected) return next();

  const provided = req.header("x-admin-key");
  if (provided && provided === expected) return next();

  return res.status(401).json({ error: "UNAUTHORIZED" });
}
