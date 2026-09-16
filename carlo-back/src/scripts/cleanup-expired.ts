import { prisma } from "../lib/prisma";
async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--dry-run", "--execute"].includes(arg)) || args.includes("--dry-run") && args.includes("--execute")) throw new Error("Use --dry-run or --execute");
  const where = { expiresAt: { lt: new Date() } };
  if (!args.includes("--execute")) {
    const [sessions, quotas, translations, requests] = await prisma.$transaction([prisma.authSession.count({where}), prisma.apiQuota.count({where}), prisma.translationCache.count({where}),prisma.aiRequest.count({where})]);
    console.log(JSON.stringify({dryRun:true,expired:{sessions,quotas,translations,requests}}));
    return;
  }
  const [sessions, quotas, translations, requests] = await prisma.$transaction([prisma.authSession.deleteMany({where}),prisma.apiQuota.deleteMany({where}),prisma.translationCache.deleteMany({where}),prisma.aiRequest.deleteMany({where})]);
  console.log(JSON.stringify({dryRun:false,removed:{sessions:sessions.count,quotas:quotas.count,translations:translations.count,requests:requests.count}}));
}
main().catch(() => { console.error("MAINTENANCE_FAILED"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
