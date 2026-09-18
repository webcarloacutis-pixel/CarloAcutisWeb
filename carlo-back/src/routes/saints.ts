import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdminKey } from "../lib/admin-key";
import { miracleData } from "../lib/content-validation";
import { createSaint, updateSaint } from "../lib/saint-service";
import { id } from "../lib/validation";
import { publicCache } from "../lib/pagination";
import { readCatalogPage, sendCatalogPage } from "../lib/catalog-pagination";
import { reserveCatalogCapacity } from "../lib/catalog-capacity";
import { HttpError } from "../lib/errors";
const router = Router();
router.get("/", async (req, res) => {
  sendCatalogPage(res, await readCatalogPage(req, "saint"));
});
router.post("/", requireAdminKey, async (req, res) => {
  const created = await createSaint(req.body);
  res.status(201).json(created);
});
router.get("/:slugOrId", async (req, res) => {
  const value = id(req.params.slugOrId);
  const saint = await prisma.saint.findFirst({ where: { OR: [{ slug: value }, { id: value }] } });
  if (!saint) throw new HttpError(404, "SAINT_NOT_FOUND");
  publicCache(req, res); res.json(saint);
});
router.patch("/:id", requireAdminKey, async (req, res) => {
  res.json(await updateSaint(id(req.params.id), req.body));
});
router.delete("/:id", requireAdminKey, async (req, res) => {
  await prisma.saint.delete({ where: { id: id(req.params.id) } });
  res.json({ ok: true });
});
router.get("/:id/miracles", async (req, res) => {
  const saintId = id(req.params.id);
  const saint = await prisma.saint.findUnique({ where: { id: saintId }, select: { id: true } });
  if (!saint) throw new HttpError(404, "SAINT_NOT_FOUND");
  sendCatalogPage(res, await readCatalogPage(req, "miracle", { saintId, approved: true }));
});
router.get("/:id/miracles/all", requireAdminKey, async (req, res) => {
  const saintId = id(req.params.id);
  const saint = await prisma.saint.findUnique({ where: { id: saintId }, select: { id: true } });
  if (!saint) throw new HttpError(404, "SAINT_NOT_FOUND");
  sendCatalogPage(res, await readCatalogPage(req, "miracle", { saintId }), true);
});
router.post("/:id/miracles", requireAdminKey, async (req, res) => {
  const data = { ...miracleData(req.body), saintId: id(req.params.id) };
  const created = await prisma.$transaction(async tx => {
    await reserveCatalogCapacity(tx, "miracle");
    return tx.miracle.create({ data });
  }, { isolationLevel: "ReadCommitted" });
  res.status(201).json(created);
});
export default router;
