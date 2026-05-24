import fs from "fs";
import { type NextRequest, NextResponse } from "next/server";

const LOG_FILE = "/tmp/ldc-client.log";
const MAX_FIELD = 500;
const MAX_BODY = 4096;

// Strip control characters that could inject fake log entries or corrupt the file
function sanitize(v: unknown, max = MAX_FIELD): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "").slice(0, max);
}

const ALLOWED_LEVELS = new Set(["INFO", "WARN", "ERROR", "APP"]);

export async function POST(req: NextRequest) {
  try {
    // Reject oversized bodies before parsing
    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY) return NextResponse.json({ ok: false }, { status: 413 });

    let body: Record<string, unknown> = {};
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

    const rawLevel = sanitize(body.level ?? "INFO");
    const level = ALLOWED_LEVELS.has(rawLevel) ? rawLevel : "INFO";
    const message = sanitize(body.message);
    const stack   = sanitize(body.stack);
    const url     = sanitize(body.url);
    const line    = sanitize(body.line);
    const col     = sanitize(body.col);

    // Trust only the first IP from x-real-ip (set by nginx); ignore x-forwarded-for spoofing
    const ip = sanitize(req.headers.get("x-real-ip") ?? "?", 45);
    const ua = sanitize(req.headers.get("user-agent") ?? "?", 200);

    const ts = new Date().toISOString();
    let entry = `[${ts}] [${level}] [${ip}]\n  ${message}`;
    if (stack) entry += `\n  STACK: ${stack}`;
    if (url)   entry += `\n  AT: ${url}:${line}:${col}`;
    entry += `\n  UA: ${ua}\n`;

    fs.appendFileSync(LOG_FILE, entry);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
