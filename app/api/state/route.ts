import { NextResponse } from "next/server";
import { getLiveState, rebalanceSurplus, simulateFlashFlood, createResourceRequest, updateDispatchStatus, upsertDisplacedPerson } from "@/lib/actions";

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
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}
