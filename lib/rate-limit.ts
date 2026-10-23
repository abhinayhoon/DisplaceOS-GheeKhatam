import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";

let nextCleanupAt = 0;

function clientIp(req: Request) {
  const candidate = req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-real-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return candidate && candidate.length <= 64 && isIP(candidate) ? candidate : "unknown";
}

/** Shared PostgreSQL counter so limits apply across server instances and survive warm starts. */
export async function rateLimited(req: Request, key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);
  const ipKey = `${key}:${clientIp(req)}`;
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${ipKey}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= ${new Date(now)} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${new Date(now)} THEN ${resetAt} ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count"
  `;
  if (now >= nextCleanupAt) {
    nextCleanupAt = now + 60_000;
    void prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(now) } } }).catch((error) => {
      console.error("Rate limit cleanup failed", error);
    });
  }
  return (rows[0]?.count ?? limit + 1) > limit;
}
