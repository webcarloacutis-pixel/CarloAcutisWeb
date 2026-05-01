import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAdminKey } from "../lib/admin-key";

const router = Router();
const prisma = new PrismaClient();

// GET /prayers/approved (alias)
// GET /api/prayers/approved (porque el router está montado en ambos prefijos)
router.get("/approved", async (req, res) => {
  try {
    const prayers = await prisma.prayer.findMany({
      where: { approved: true },
    });
    return res.json(prayers);
  } catch (e: any) {
    return res.status(500).json({ error: "PRAYERS_APPROVED_FAILED", detail: String(e?.message ?? e) });
  }
});

router.get("/", async (_req, res) => {
  try {
    const rows = await prisma.prayer.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" } as any,
    });
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: "PRAYERS_LIST_FAILED", detail: String(e?.message || e) });
  }
});

router.get("/all", requireAdminKey, async (_req, res) => {
  try {
    const rows = await prisma.prayer.findMany({
      orderBy: { createdAt: "desc" } as any,
    });
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: "PRAYERS_LIST_ALL_FAILED", detail: String(e?.message || e) });
  }
});

router.post("/", requireAdminKey, async (req, res) => {
  try {
    const created = await prisma.prayer.create({ data: req.body });
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: "PRAYER_CREATE_FAILED", detail: String(e?.message || e) });
  }
});

router.patch("/:id/approve", requireAdminKey, async (req, res) => {
  try {
    const updated = await prisma.prayer.update({
      where: { id: req.params.id },
      data: { approved: true },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: "PRAYER_APPROVE_FAILED", detail: String(e?.message || e) });
  }
});

export default router;
