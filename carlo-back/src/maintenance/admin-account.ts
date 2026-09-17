import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
export interface AdminAccountInput { email: string; password: string; execute?: boolean; expectedUserId?: string | null }
export interface AdminAccountResult { action: string; existingUserId: string | null; duplicateMatches: number; adminAfter: boolean; passwordMatchesBefore: boolean; sessionsWillBeRevoked: boolean; executed: boolean; userId?: string; passwordVerified?: boolean; sessionsRevoked?: number }
export async function provisionAdminAccount(db: PrismaClient, input: AdminAccountInput, backup?: (snapshot: unknown) => Promise<void>): Promise<AdminAccountResult> {
  const email = input.email.trim().toLowerCase(), password = input.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) throw new Error("INVALID_ADMIN_INPUT");
  return db.$transaction(async tx => {
    // Serialize maintenance of this email without locking unrelated accounts.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"admin-account:" + email}))::text`;
    const matches = await tx.user.findMany({where:{email:{equals:email,mode:"insensitive"}}});
    if (matches.length > 1) throw new Error("AMBIGUOUS_EXISTING_ACCOUNT");
    const existing = matches[0];
    const passwordMatches = existing ? await bcrypt.compare(password, existing.passwordHash) : false;
    const action = !existing ? "CREATE" : !passwordMatches || !existing.isAdmin || existing.email !== email ? "UPDATE" : "UNCHANGED";
    const preview = { action, existingUserId: existing?.id ?? null, duplicateMatches: matches.length, adminAfter: true, passwordMatchesBefore: passwordMatches, sessionsWillBeRevoked: action === "UPDATE" };
    if (!input.execute) return { ...preview, executed: false };
    if (input.expectedUserId !== (existing?.id ?? null)) throw new Error("ACCOUNT_CHANGED_SINCE_PREVIEW");
    if (action === "UNCHANGED") return {...preview,executed:true,userId:existing!.id,passwordVerified:true,sessionsRevoked:0};
    if (!backup) throw new Error("PRIVATE_BACKUP_REQUIRED");
    const sessions = existing ? await tx.authSession.findMany({where:{userId:existing.id}}) : [];
    await backup({account:existing??null,sessions,capturedAt:new Date().toISOString()});
    const passwordHash = passwordMatches ? existing!.passwordHash : await bcrypt.hash(password,12);
    const account = existing ? await tx.user.update({where:{id:existing.id},data:{email,passwordHash,isAdmin:true}}) : await tx.user.create({data:{email,passwordHash,isAdmin:true}});
    const revoked = existing ? await tx.authSession.deleteMany({where:{userId:existing.id}}) : {count:0};
    if (!await bcrypt.compare(password,account.passwordHash)) throw new Error("PASSWORD_VERIFICATION_FAILED");
    return {...preview,executed:true,userId:account.id,passwordVerified:true,sessionsRevoked:revoked.count};
  },{maxWait:5000,timeout:15000});
}
