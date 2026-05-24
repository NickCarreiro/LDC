import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_TTL_MS } from "../../../../lib/authConstants";

function makeSessionToken(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  const expiry = (Date.now() + SESSION_TTL_MS).toString(16);
  const rand = randomBytes(16).toString("hex");
  const payload = `${expiry}.${rand}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export async function POST(req: NextRequest) {
  let body: { password?: unknown } = {};
  try { body = await req.json(); } catch { /* empty/malformed body */ }

  const supplied = typeof body.password === "string" ? body.password : "";
  const expected = process.env.ORGANIZER_PASS ?? "";

  // Constant-time comparison — pad to same length so length difference
  // doesn't leak through early exit
  const maxLen = Math.max(supplied.length, expected.length, 1);
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  Buffer.from(supplied).copy(a);
  Buffer.from(expected).copy(b);
  const match = supplied.length === expected.length && timingSafeEqual(a, b);

  if (!match) {
    // Fixed-duration response to blunt timing attacks across the network
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = makeSessionToken();
  const isHttps = req.headers.get("x-forwarded-proto") === "https";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    secure: isHttps,
  });
  return res;
}
