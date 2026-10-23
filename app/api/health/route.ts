import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDemoModeEnabled } from "@/lib/auth";
import { serviceReadinessMessage } from "@/lib/service-errors";

export async function GET() {
  await connection();
  if (!(process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET)?.trim() ||
      (process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET)!.length < 32) {
    return NextResponse.json({ ready: false, message: serviceReadinessMessage("secret") }, { status: 503, headers: { "cache-control": "no-store" } });
  }

  try {
    const [tables] = await prisma.$queryRaw<Array<{ users: string | null; camps: string | null; rateLimits: string | null }>>`
      SELECT to_regclass('"User"')::text AS users,
             to_regclass('"ReliefCamp"')::text AS camps,
             to_regclass('"RateLimitBucket"')::text AS "rateLimits"
    `;
    if (!tables?.users || !tables.camps || !tables.rateLimits) {
      return NextResponse.json({ ready: false, message: serviceReadinessMessage("schema") }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    if (isDemoModeEnabled() && await prisma.reliefCamp.count() === 0) {
      return NextResponse.json({ ready: false, message: serviceReadinessMessage("demo_data") }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    return NextResponse.json({ ready: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.warn("Readiness check failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ ready: false, message: serviceReadinessMessage("database") }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
