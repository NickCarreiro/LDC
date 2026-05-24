import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_TTL_MS } from "./lib/authConstants";

export { SESSION_COOKIE };

// Paths that never require authentication
const PUBLIC_EXACT = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/log",
  "/forms/summer-2026/register",
  "/forms/summer-2026",
]);
const PUBLIC_PREFIX = ["/_next/", "/brand/", "/favicon"];

// Use Web Crypto API — compatible with Next.js Edge Runtime
async function isValidSessionToken(token: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [tsHex, rand, sig] = parts;
    const expiry = parseInt(tsHex, 16);
    if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

    const payload = `${tsHex}.${rand}`;
    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      "raw", enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false, ["verify"]
    );
    const sigBytes = new Uint8Array(
      sig.match(/.{2}/g)?.map((h) => parseInt(h, 16)) ?? []
    );
    if (sigBytes.length !== 32) return false; // SHA-256 HMAC is always 32 bytes
    return globalThis.crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const valid = await isValidSessionToken(token);

  // API routes — hard 401 if session is missing or invalid
  if (pathname.startsWith("/api/")) {
    if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // Page routes — pass through; AppShell calls /api/auth/verify to confirm
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// Re-export for use in API routes (Node.js runtime) — token generation lives there
export { SESSION_TTL_MS };
