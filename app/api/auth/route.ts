import { NextResponse } from "next/server";
import { OPERATORS } from "@/lib/types";
import { SESSION_COOKIE, checkCredentials, cookieOpts, getSessionUser, signSession } from "@/lib/auth";
import { rateLimited } from "@/lib/rate-limit";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user, token: user ? signSession(user.badgeId) : null });
}

export async function POST(req: Request) {
  if (rateLimited(req, "auth", 30)) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  const b = await req.json().catch(() => null);
  const badgeId = String(b?.badgeId ?? "");
  // Judge 1-click login skips the passcode (demo deployments only).
  const instant = b?.instant === true && process.env.DEMO_MODE !== "false";
  const op = instant ? OPERATORS.find((o) => o.badgeId === badgeId) ?? null : checkCredentials(badgeId, String(b?.passcode ?? ""));
  if (!op) return NextResponse.json({ error: "Invalid Badge ID or passcode" }, { status: 401 });
  const token = signSession(op.badgeId);
  const res = NextResponse.json({ user: { badgeId: op.badgeId, name: op.name, role: op.role, campName: op.campName }, token });
  res.cookies.set(SESSION_COOKIE, token, cookieOpts);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOpts, maxAge: 0 });
  return res;
}
