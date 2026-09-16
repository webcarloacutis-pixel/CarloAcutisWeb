import type { Application } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errors";
import { pageArgs, publicCache, sendPage } from "../lib/pagination";
export function registerPopularityRoute(app: Application) {
  app.get(["/popularity", "/api/popularity"], async (req, res) => {
    if (req.query.kind && req.query.contentType && req.query.kind !== req.query.contentType) throw new HttpError(400, "CONFLICTING_CONTENT_TYPE");
    const kind = req.query.contentType ?? req.query.kind;
    if (kind !== "prayer" && kind !== "verse") throw new HttpError(400, "INVALID_CONTENT_TYPE");
    const { limit, query } = pageArgs(req);
    const where = { contentType: kind, score: { not: null } };
    const select = { id: true, contentType: true, contentId: true, score: true, generatedAt: true, model: true, methodologyVersion: true, inputHash: true };
    const [rows,total] = await prisma.$transaction([prisma.popularityEstimate.findMany({ where, ...query, select }),prisma.popularityEstimate.count({ where })]);
    publicCache(req, res); res.json(sendPage(res, rows, total, limit));
  });
}
