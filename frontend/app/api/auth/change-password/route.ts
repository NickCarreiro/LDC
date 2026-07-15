import { timingSafeEqual } from "crypto";
import { readFile, writeFile } from "fs/promises";
import path from "path";

import { type NextRequest, NextResponse } from "next/server";

// Repo-root .env, one level up from the frontend/ working directory this
// process runs from — same file systemd's EnvironmentFile= injects on the
// production host.
const ENV_PATH = path.join(process.cwd(), "..", ".env");

function constantTimeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length, 1);
  const bufA = Buffer.alloc(maxLen);
  const bufB = Buffer.alloc(maxLen);
  Buffer.from(a).copy(bufA);
  Buffer.from(b).copy(bufB);
  return a.length === b.length && timingSafeEqual(bufA, bufB);
}

// Middleware already requires a valid session cookie for every /api/* route
// not in its public allowlist, so reaching this handler means the caller is
// already an authenticated organizer. Requiring the current password too is
// defense in depth against a hijacked session changing the password silently.
export async function POST(req: NextRequest) {
  let body: { currentPassword?: unknown; newPassword?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty/malformed body */
  }

  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  const expected = process.env.ORGANIZER_PASS ?? "";

  if (!constantTimeEqual(current, expected)) {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 200));
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  if (next.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (/[\r\n]/.test(next)) {
    // .env is line-oriented and gets consumed by systemd EnvironmentFile=,
    // bash `source`, and a couple of hand-rolled parsers — a raw newline
    // in the value would let it inject an arbitrary extra config line.
    return NextResponse.json(
      { error: "New password cannot contain line breaks" },
      { status: 400 }
    );
  }

  let contents: string;
  try {
    contents = await readFile(ENV_PATH, "utf8");
  } catch {
    return NextResponse.json(
      { error: "Could not read the server's .env file" },
      { status: 500 }
    );
  }

  // JSON.stringify gives a double-quoted, escaped literal — safe to embed
  // in the file regardless of what characters the password contains, and
  // this repo's own .env readers already strip a matching pair of quotes.
  const newLine = `ORGANIZER_PASS=${JSON.stringify(next)}`;
  let found = false;
  const lines = contents.split("\n").map((line) => {
    if (/^ORGANIZER_PASS=/.test(line)) {
      found = true;
      return newLine;
    }
    return line;
  });
  if (!found) lines.push(newLine);

  try {
    await writeFile(ENV_PATH, lines.join("\n"), { mode: 0o600 });
  } catch {
    return NextResponse.json(
      { error: "Could not write the server's .env file" },
      { status: 500 }
    );
  }

  // Take effect immediately for this running process, in addition to being
  // persisted to disk for the next restart.
  process.env.ORGANIZER_PASS = next;

  return NextResponse.json({ ok: true });
}
