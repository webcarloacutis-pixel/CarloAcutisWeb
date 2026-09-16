import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdminKey } from "../lib/admin-key";
import { prayerData } from "../lib/content-validation";
import { id } from "../lib/validation";
import { pageArgs, publicCache, sendPage } from "../lib/pagination";
const router = Router();
router.get(["/", "/approved"], async (req, res) => {
  const { limit, query } = pageArgs(req);
  const where = { approved: true };
  const [rows, total] = await prisma.$transaction([prisma.prayer.findMany({ ...query, where }), prisma.prayer.count({ where })]);
  publicCache(req, res); res.json(sendPage(res, rows, total, limit));
});
router.get("/all", requireAdminKey, async (req, res) => {
  const { limit, query } = pageArgs(req);
  const [rows, total] = await prisma.$transaction([prisma.prayer.findMany(query), prisma.prayer.count()]);
  res.json(sendPage(res, rows, total, limit));
});
router.post("/", requireAdminKey, async (req, res) => {
  res.status(201).json(await prisma.prayer.create({ data: prayerData(req.body) }));
});
router.patch("/:id/approve", requireAdminKey, async (req, res) => {
  res.json(await prisma.prayer.update({ where: { id: id(req.params.id) }, data: { approved: true } }));
});
router.patch("/:id", requireAdminKey, async (req, res) => {
  res.json(await prisma.prayer.update({ where: { id: id(req.params.id) }, data: prayerData(req.body, true) }));
});
router.delete("/:id", requireAdminKey, async (req, res) => {
  await prisma.prayer.delete({ where: { id: id(req.params.id) } });
  res.json({ ok: true });
});
export default router;
