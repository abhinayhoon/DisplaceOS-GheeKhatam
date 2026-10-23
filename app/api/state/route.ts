import { NextResponse } from "next/server";
import { getLiveState, rebalanceSurplus, simulateFlashFlood, createResourceRequest, updateDispatchStatus, upsertDisplacedPerson, approveRequest, adjustCampStock } from "@/lib/actions";

export async function GET() {
  return NextResponse.json(await getLiveState());
}

export async function POST(req: Request) {
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
}
