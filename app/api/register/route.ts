import { NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";

const ROLES = ["RELIEF_CAMP"];

export async function GET(req: Request) {
  try {
    if (await rateLimited(req, "register-get", 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const camps = await prisma.reliefCamp.findMany({ select: { id: true, name: true, district: true }, orderBy: { name: "asc" } });
    return NextResponse.json(camps, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Camp list request failed", error);
    return NextResponse.json({ error: "Registration service unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (await rateLimited(req, "register", 10)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  } catch (error) {
    console.error("Registration rate limit failed", error);
    return NextResponse.json({ error: "Registration service unavailable" }, { status: 500 });
  }
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  const role = String(b?.role ?? "");
  const campId = b?.campId ? String(b.campId) : null;
  if (!name || name.length > 100 || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Valid name and email required" }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Password must be 8-128 characters" }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  try {
    if (role === "RELIEF_CAMP" && !(campId && (await prisma.reliefCamp.findUnique({ where: { id: campId } })))) {
      return NextResponse.json({ error: "Select a valid camp" }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, emailVerified: false, approved: false, role, campId },
      });
      await tx.account.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password: passwordHash } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error("Account registration failed", error);
    return NextResponse.json({ error: "Registration service unavailable" }, { status: 500 });
  }
}
