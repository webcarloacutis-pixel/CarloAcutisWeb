import type { Request, Response } from "express";
import { HttpError } from "./errors";
import { id } from "./validation";
export function pageArgs(req: Request) {
  const rawLimit = req.query.limit ?? "100";
  if (typeof rawLimit !== "string" || !/^\d+$/.test(rawLimit)) throw new HttpError(400, "INVALID_LIMIT");
  const limit = Number(rawLimit);
  if (limit < 1 || limit > 100) throw new HttpError(400, "INVALID_LIMIT");
  const cursor = req.query.cursor === undefined ? undefined : id(req.query.cursor);
  return { limit, query: { take: limit + 1, orderBy: { id: "asc" as const }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) } };
}
export function sendPage<T extends { id: string }>(res: Response, rows: T[], total: number, limit: number) {
  const page = rows.slice(0, limit);
  res.set("X-Total-Count", String(total));
  res.set("X-Next-Cursor", rows.length > limit ? page[page.length - 1].id : "");
  return page;
}
export function publicCache(req: Request, res: Response) {
  if (!req.headers.cookie && !req.headers["x-admin-key"]) res.set("Cache-Control", "public, max-age=30, s-maxage=60");
}
