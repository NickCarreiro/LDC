import { NextResponse } from "next/server";

// Middleware already validates the session cookie before this handler runs.
// Reaching here means the request is authenticated.
export async function GET() {
  return NextResponse.json({ ok: true });
}
