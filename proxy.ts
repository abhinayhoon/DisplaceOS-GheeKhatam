import { NextResponse } from "next/server";

// Auth is enforced server-side in /api/state and lib/auth.ts; the dashboard renders its own login gate.
export function proxy() {
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
