const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.miracle.findMany({
    select: { id: true, title: true, details: true, approved: true, saintId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const bad = rows.filter(r => {
    const t = (r.title || "").trim();
    return t === "" || /^cm[a-z0-9]{10,}$/i.test(t); // títulos tipo "cmj...." (parece id)
  });

  console.log("=== POSIBLES REGISTROS DAÑADOS ===");
  console.table(bad.map(r => ({
    id: r.id,
    title: r.title,
    approved: r.approved,
    details: r.details,
    saintId: r.saintId,
    createdAt: r.createdAt
  })));

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("ERROR:", e);
  await prisma.$disconnect();
  process.exit(1);
});
