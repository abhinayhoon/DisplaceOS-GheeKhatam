import { NextResponse } from "next/server";
import { getLiveState, rebalanceSurplus, simulateFlashFlood, createResourceRequest, updateDispatchStatus, upsertDisplacedPerson, approveRequest, adjustCampStock } from "@/lib/actions";
import { AuthError } from "@/lib/session";

function fail(e: unknown) {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 400 });
}

export async function GET() {
  try {
    return NextResponse.json(await getLiveState());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();
    switch (action) {
      case "rebalance":
        return NextResponse.json(await rebalanceSurplus());
      case "flood":
        return NextResponse.json(await simulateFlashFlood());
      case "createRequest":
        return NextResponse.json(await createResourceRequest(payload));
      case "dispatchStatus":
        return NextResponse.json(await updateDispatchStatus(payload.id, payload.routeStatus));
      case "person":
        return NextResponse.json(await upsertDisplacedPerson(payload));
      case "approve":
        return NextResponse.json(await approveRequest(payload.id));
      case "stock":
        return NextResponse.json(await adjustCampStock(payload.campId, payload.field, payload.delta));
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    return fail(e);
  }
}
