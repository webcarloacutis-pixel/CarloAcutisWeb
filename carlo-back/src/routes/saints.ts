import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { requireAdminKey } from "../lib/admin-key";
import { slugify } from "../lib/slugify";

const router = Router();
const prisma = new PrismaClient();

router.post("/", requireAdminKey, async (req, res) => {
  try {
    const body: any = req.body ?? {};
    const name = String(body.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "NAME_REQUIRED" });

    let slug = String(body.slug ?? "").trim();
    if (!slug) slug = slugify(name);

    const data: any = { ...body, name, slug };
    delete data.id;

    try {
      const created = await prisma.saint.create({ data });
      return res.status(201).json(created);
    } catch (e: any) {
      if (e?.code === "P2002") {
        const suffix = Date.now().toString().slice(-6);
        const created = await prisma.saint.create({
          data: { ...data, slug: `${slug}-${suffix}` },
        });
        return res.status(201).json(created);
      }
      throw e;
    }
  } catch (e: any) {
    return res.status(500).json({
      error: "SAINT_CREATE_FAILED",
      detail: String(e?.message ?? e),
    });
  }
});

router.get("/", async (_req, res) => {
  try {
    const saints = await prisma.saint.findMany({
      orderBy: { createdAt: "desc" } as any,
    });
    res.json(saints);
  } catch (e: any) {
    try {
      const saints = await prisma.saint.findMany();
      res.json(saints);
    } catch (e2: any) {
      res.status(500).json({
        error: "SAINTS_LIST_FAILED",
        detail: String(e2?.message || e2),
      });
    }
  }
});

router.get("/:slugOrId", async (req, res) => {
  const slugOrId = req.params.slugOrId;

  try {
    try {
      const bySlug = await (prisma as any).saint.findUnique({
        where: { slug: slugOrId },
      });
      if (bySlug) return res.json(bySlug);
    } catch {}

    const byId = await prisma.saint.findUnique({
      where: { id: slugOrId },
    });
    if (!byId) return res.status(404).json({ error: "SAINT_NOT_FOUND" });
    return res.json(byId);
  } catch (e: any) {
    return res.status(500).json({
      error: "SAINT_GET_FAILED",
      detail: String(e?.message || e),
    });
  }
});

export default router;
