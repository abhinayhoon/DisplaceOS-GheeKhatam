import { NextResponse } from "next/server";
import { runAction, getState } from "@/lib/actions";
import { AuthError, requireUser } from "@/lib/auth";

function fail(e: unknown) {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 400 });
}

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await getState());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { action, payload } = await req.json();
    const out = await runAction(user, String(action), payload);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    return fail(e);
  }
}
