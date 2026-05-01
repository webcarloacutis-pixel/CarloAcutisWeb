const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[2] || "saints_seed.json";
  if (!fs.existsSync(file)) {
    console.error(`No existe ${file}. Crea saints_seed.json primero.`);
    process.exit(1);
  }
  const saints = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(saints) || saints.length === 0) {
    console.error("El JSON debe ser un array de santos.");
    process.exit(1);
  }

  // Upsert por slug para que no choque con duplicados
  let ok = 0;
  for (const s of saints) {
    if (!s.slug || !s.name) continue;
    await prisma.saint.upsert({
      where: { slug: s.slug },
      create: s,
      update: s,
    });
    ok++;
  }

  console.log(`✅ Seed listo. Upserts: ${ok}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
