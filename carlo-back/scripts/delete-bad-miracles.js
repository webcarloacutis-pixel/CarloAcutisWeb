const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.miracle.findMany({ select: { id: true, title: true } });

  const ids = rows
    .filter(r => {
      const t = (r.title || "").trim();
      return t === "" || /^cm[a-z0-9]{10,}$/i.test(t);
    })
    .map(r => r.id);

  console.log("Se van a borrar:", ids.length, "milagros");
  if (!ids.length) {
    console.log("✅ No hay nada para borrar.");
    await prisma.$disconnect();
    return;
  }

  const r = await prisma.miracle.deleteMany({ where: { id: { in: ids } } });
  console.log("✅ deleteMany:", r);

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error("ERROR:", e);
  await prisma.$disconnect();
  process.exit(1);
});
