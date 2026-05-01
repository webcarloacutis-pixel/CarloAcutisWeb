import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

router.post("/", async (req, res) => {
  try {
    const about = String(req.body?.about || "");
    const qualities = Array.isArray(req.body?.qualities) ? req.body.qualities.map(String) : [];
    const growthAreas = Array.isArray(req.body?.growthAreas) ? req.body.growthAreas.map(String) : [];

    const terms = [
      ...qualities,
      ...growthAreas,
      ...about
        .toLowerCase()
        .replace(/[^a-záéíóúñü0-9\s]/gi, " ")
        .split(/\s+/)
        .filter(Boolean),
    ]
      .map((t) => String(t).toLowerCase().trim())
      .filter((t) => t.length >= 3);

    const saints = await prisma.saint.findMany({
      where: {
        NOT: { slug: { startsWith: "test-" } },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        biography: true,
        country: true,
        title: true,
      },
      take: 500,
    });

    const matches = saints
      .map((s) => {
        const name = (s.name || "").toLowerCase();
        const country = (s.country || "").toLowerCase();
        const title = (s.title || "").toLowerCase();
        const bio = (s.biography || "").toLowerCase();

        let score = 0;
        for (const t of terms) {
          if (name.includes(t)) score += 4;
          if (title.includes(t)) score += 3;
          if (country.includes(t)) score += 2;
          if (bio.includes(t)) score += 1;
        }

        return { id: s.id, slug: s.slug, name: s.name, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const summary = matches.length
      ? "Elegimos estos santos por afinidad con tus cualidades y áreas de crecimiento. Lee su historia y elige el que más resuene contigo hoy."
      : "No encontramos coincidencias claras. Intenta escribir más sobre ti o seleccionar algunas cualidades y áreas de crecimiento.";

    return res.json({ summary, matches });
  } catch (e: any) {
    console.error("discover-saint failed:", e);
    return res.status(500).json({ error: "discover-saint failed", message: e?.message || String(e) });
  }
});

export default router;
