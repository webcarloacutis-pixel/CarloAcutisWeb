import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAdminKey } from "../lib/admin-key";

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (_req, res) => {
  try {
    const miracles = await prisma.miracle.findMany({
      orderBy: { createdAt: "desc" } as any,
    });
    return res.json(miracles);
  } catch (e: any) {
    return res.status(500).json({
      error: "MIRACLES_LIST_FAILED",
      detail: String(e?.message ?? e),
    });
  }
});

router.patch("/:id", requireAdminKey, async (req, res) => {
  try {
    const updated = await prisma.miracle.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(updated);
  } catch (e: any) {
    return res.status(500).json({
      error: "MIRACLE_UPDATE_FAILED",
      detail: String(e?.message ?? e),
    });
  }
});

router.delete("/:id", requireAdminKey, async (req, res) => {
  try {
    await prisma.miracle.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({
      error: "MIRACLE_DELETE_FAILED",
      detail: String(e?.message ?? e),
    });
  }
});

export default router;
