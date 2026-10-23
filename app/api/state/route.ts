import { NextResponse } from "next/server";
import { ActionError, runAction, getState } from "@/lib/actions";
import { AuthError, requireUser } from "@/lib/auth";

function fail(e: unknown) {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: 400 });
  console.error("State API request failed", e);
  return NextResponse.json({ error: "Request could not be completed" }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(await getState(undefined, user), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.action !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const packetId = typeof body.packetId === "string" ? body.packetId : undefined;
    const out = await runAction(user, body.action, body.payload, packetId);
    return NextResponse.json({ ok: true, ...out }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}
