import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdminKey } from "../lib/admin-key";
import { miracleData } from "../lib/content-validation";
import { id } from "../lib/validation";
import { readMiracleCards, sendMiracleCards } from "../lib/miracle-catalog";
import { readCatalogPage, sendCatalogPage } from "../lib/catalog-pagination";
const router = Router();
router.get("/", async (req, res) => {
  if (req.query.view === "cards") { sendMiracleCards(res, await readMiracleCards(req, { approved: true })); return; }
  sendCatalogPage(res, await readCatalogPage(req, "miracle", { approved: true }));
});
router.get("/all", requireAdminKey, async (req, res) => {
  if (req.query.view === "cards") { sendMiracleCards(res, await readMiracleCards(req), true); return; }
  sendCatalogPage(res, await readCatalogPage(req, "miracle"), true);
});
router.patch("/:id", requireAdminKey, async (req, res) => {
  res.json(await prisma.miracle.update({ where: { id: id(req.params.id) }, data: miracleData(req.body, true) }));
});
router.delete("/:id", requireAdminKey, async (req, res) => {
  await prisma.miracle.delete({ where: { id: id(req.params.id) } }); res.json({ ok: true });
});
export default router;
