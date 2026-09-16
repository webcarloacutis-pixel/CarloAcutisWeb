import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { ContentKey, EstimateRepository, EstimateRow, ValidEstimate } from "./domain";

export function prismaEstimateRepository(client: PrismaClient): EstimateRepository {
  return {
    async read(key): Promise<EstimateRow | null> {
      return client.popularityEstimate.findUnique({
        where: { contentType_contentId: { contentType: key.contentType, contentId: key.contentId } },
        select: { contentType: true, contentId: true, score: true, generatedAt: true,
          model: true, methodologyVersion: true, inputHash: true },
      }) as Promise<EstimateRow | null>;
    },
    async acquire(key: ContentKey, owner: string, leaseMs: number): Promise<boolean> {
      const count = await client.$executeRaw(Prisma.sql`
        INSERT INTO "PopularityEstimate" ("id", "contentType", "contentId", "leaseOwner", "leaseUntil")
        VALUES (${randomUUID()}, ${key.contentType}, ${key.contentId}, ${owner},
                (NOW() AT TIME ZONE 'UTC') + ${leaseMs} * INTERVAL '1 millisecond')
        ON CONFLICT ("contentType", "contentId") DO UPDATE
          SET "leaseOwner" = EXCLUDED."leaseOwner", "leaseUntil" = EXCLUDED."leaseUntil"
          WHERE "PopularityEstimate"."leaseUntil" IS NULL OR "PopularityEstimate"."leaseUntil" <= (NOW() AT TIME ZONE 'UTC')
      `);
      return count === 1;
    },
    async save(key: ContentKey, owner: string, estimate: ValidEstimate): Promise<boolean> {
      const count = await client.$executeRaw(Prisma.sql`
        UPDATE "PopularityEstimate"
        SET "score" = ${estimate.score}, "generatedAt" = (${estimate.generatedAt}::timestamptz AT TIME ZONE 'UTC'),
            "model" = ${estimate.model}, "methodologyVersion" = ${estimate.methodologyVersion},
            "inputHash" = ${estimate.inputHash}, "leaseOwner" = NULL, "leaseUntil" = NULL
        WHERE "contentType" = ${key.contentType} AND "contentId" = ${key.contentId}
          AND "leaseOwner" = ${owner} AND "leaseUntil" > (NOW() AT TIME ZONE 'UTC')
      `);
      return count === 1;
    },
    async release(key: ContentKey, owner: string): Promise<void> {
      await client.popularityEstimate.updateMany({
        where: { contentType: key.contentType, contentId: key.contentId, leaseOwner: owner }, data: { leaseOwner: null, leaseUntil: null },
      });
    },
  };
}
