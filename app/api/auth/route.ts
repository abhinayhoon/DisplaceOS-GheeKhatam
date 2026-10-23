import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AuthError, authenticate, cookieOpts, createSession, getSessionUser, revokeSession, SESSION_COOKIE } from "@/lib/auth";
import { rateLimited } from "@/lib/rate-limit";
import { serviceFailureMessage, serviceFailureStatus } from "@/lib/service-errors";

function errorResponse(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Authentication request failed", error);
  return NextResponse.json({ error: serviceFailureMessage(error, "Authentication service unavailable") }, { status: serviceFailureStatus(error) });
}

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    if (await rateLimited(req, "auth", 30)) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const user = await authenticate(body);
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    const token = await createSession(user);
    const response = NextResponse.json({ user }, { headers: { "cache-control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, token, cookieOpts);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOpts, maxAge: 0 });
  try {
    await revokeSession((await cookies()).get(SESSION_COOKIE)?.value);
  } catch (error) {
    console.error("Session revocation failed", error);
    const failed = NextResponse.json({ error: "Could not revoke session" }, { status: 500, headers: { "cache-control": "no-store" } });
    failed.cookies.set(SESSION_COOKIE, "", { ...cookieOpts, maxAge: 0 });
    return failed;
  }
  return response;
}
