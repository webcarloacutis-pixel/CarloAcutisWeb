import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma';
import { integrationDatabaseEnabled } from '../lib/test-database';

const enabled = integrationDatabaseEnabled();
const prefix = 'cleanup-fixture-' + randomUUID();
const execute = promisify(execFile);
describe.skipIf(!enabled).sequential('actual cleanup CLI in disposable PostgreSQL', () => {
  const expired = new Date(Date.now() - 3_600_000), future = new Date(Date.now() + 86_400_000);
  async function counts() {
    return prisma.$transaction([
      prisma.authSession.count({where:{id:{startsWith:prefix}}}), prisma.apiQuota.count({where:{key:{startsWith:prefix}}}),
      prisma.translationCache.count({where:{id:{startsWith:prefix}}}), prisma.aiRequest.count({where:{id:{startsWith:prefix}}}),
    ]);
  }
  async function run(...args: string[]) {
    const { stdout } = await execute(process.execPath, ['node_modules/tsx/dist/cli.mjs','src/scripts/cleanup-expired.ts',...args], {
      cwd: process.cwd(), env: process.env, timeout: 30_000,
    });
    return JSON.parse(stdout.trim()) as {dryRun:boolean;expired?:Record<string,number>;removed?:Record<string,number>};
  }
  beforeAll(async () => {
    await prisma.saint.create({data:{id:prefix,slug:prefix,name:'Synthetic cleanup preservation sentinel',biography:'Disposable fixture only.'}});
    for (const [suffix, expiresAt] of [['expired',expired],['live',future]] as const) {
      const id=prefix+'-'+suffix;
      await prisma.authSession.create({data:{id,kind:'user',expiresAt}});
      await prisma.apiQuota.create({data:{key:id,count:1,expiresAt}});
      await prisma.translationCache.create({data:{id,translated:'Synthetic test',model:'synthetic',targetLang:'es',expiresAt}});
      await prisma.aiRequest.create({data:{id,inputHash:'a'.repeat(64),leaseOwner:prefix,leaseUntil:expired,expiresAt}});
    }
  });
  afterAll(async () => {
    await prisma.authSession.deleteMany({where:{id:{startsWith:prefix}}});
    await prisma.apiQuota.deleteMany({where:{key:{startsWith:prefix}}});
    await prisma.translationCache.deleteMany({where:{id:{startsWith:prefix}}});
    await prisma.aiRequest.deleteMany({where:{id:{startsWith:prefix}}});
    await prisma.saint.deleteMany({where:{id:prefix}});await prisma.$disconnect();
  });
  it('previews without deleting, removes expired rows only, preserves catalogue and is idempotent', async () => {
    const catalogue=await prisma.saint.findUniqueOrThrow({where:{id:prefix}});
    const preview=await run('--dry-run');expect(preview.dryRun).toBe(true);
    for (const number of Object.values(preview.expired!)) expect(number).toBeGreaterThanOrEqual(1);
    expect(await counts()).toEqual([2,2,2,2]);
    const applied=await run('--execute');expect(applied.dryRun).toBe(false);
    for (const number of Object.values(applied.removed!)) expect(number).toBeGreaterThanOrEqual(1);
    expect(await counts()).toEqual([1,1,1,1]);
    expect(await prisma.authSession.findUnique({where:{id:prefix+'-live'}})).not.toBeNull();
    expect(await prisma.apiQuota.findUnique({where:{key:prefix+'-live'}})).not.toBeNull();
    expect(await prisma.translationCache.findUnique({where:{id:prefix+'-live'}})).not.toBeNull();
    expect(await prisma.aiRequest.findUnique({where:{id:prefix+'-live'}})).not.toBeNull();
    expect(await prisma.saint.findUniqueOrThrow({where:{id:prefix}})).toEqual(catalogue);
    expect((await run('--execute')).removed).toEqual({sessions:0,quotas:0,translations:0,requests:0});
  }, 60_000);
  it('rejects ambiguous execute/dry-run arguments without deleting current rows', async () => {
    const before=await counts();await expect(run('--execute','--dry-run')).rejects.toMatchObject({code:1});
    expect(await counts()).toEqual(before);
  });
});
