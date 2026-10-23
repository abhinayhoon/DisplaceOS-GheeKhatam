import { NextResponse } from "next/server";

// Legacy better-auth endpoint retired; see app/api/auth/route.ts.
const gone = () => NextResponse.json({ error: "Moved to /api/auth" }, { status: 410 });
export const GET = gone;
export const POST = gone;
