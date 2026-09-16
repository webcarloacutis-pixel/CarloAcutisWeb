import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdminKey } from "../lib/admin-key";
import { miracleData } from "../lib/content-validation";
import { id } from "../lib/validation";
import { pageArgs, publicCache, sendPage } from "../lib/pagination";
const router = Router();
router.get("/", async (req, res) => {
  const { limit, query } = pageArgs(req);
  const where = { approved: true };
  const [rows, total] = await prisma.$transaction([prisma.miracle.findMany({ ...query, where }), prisma.miracle.count({ where })]);
  publicCache(req, res); res.json(sendPage(res, rows, total, limit));
});
router.get("/all", requireAdminKey, async (req, res) => {
  const { limit, query } = pageArgs(req);
  const [rows, total] = await prisma.$transaction([prisma.miracle.findMany(query), prisma.miracle.count()]);
  res.set("Cache-Control", "private, no-store"); res.json(sendPage(res, rows, total, limit));
});
router.patch("/:id", requireAdminKey, async (req, res) => {
  res.json(await prisma.miracle.update({ where: { id: id(req.params.id) }, data: miracleData(req.body, true) }));
});
router.delete("/:id", requireAdminKey, async (req, res) => {
  await prisma.miracle.delete({ where: { id: id(req.params.id) } }); res.json({ ok: true });
});
export default router;
