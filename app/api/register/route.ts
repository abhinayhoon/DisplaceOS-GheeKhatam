import { NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";

const ROLES = ["RELIEF_CAMP", "RESCUE_TEAM"];

export async function GET(req: Request) {
  if (rateLimited(req, "register-get", 30)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const camps = await prisma.reliefCamp.findMany({ select: { id: true, name: true, district: true }, orderBy: { name: "asc" } });
  return NextResponse.json(camps);
}

export async function POST(req: Request) {
  if (rateLimited(req, "register", 10)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  const role = String(b?.role ?? "");
  const campId = b?.campId ? String(b.campId) : null;
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Valid name and email required" }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Password must be 8-128 characters" }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (role === "RELIEF_CAMP" && !(campId && (await prisma.reliefCamp.findUnique({ where: { id: campId } })))) {
    return NextResponse.json({ error: "Select a valid camp" }, { status: 400 });
  }
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  const user = await prisma.user.create({
    data: { name, email, emailVerified: true, role, campId: role === "RELIEF_CAMP" ? campId : null },
  });
  await prisma.account.create({ data: { accountId: user.id, providerId: "credential", userId: user.id, password: await hashPassword(password) } });
  return NextResponse.json({ ok: true });
}
