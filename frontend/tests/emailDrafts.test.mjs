import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const outDir = mkdtempSync(join(tmpdir(), "ldc-email-drafts-"));

try {
  execFileSync(
    join(process.cwd(), "node_modules", ".bin", "tsc"),
    [
      "lib/emailDrafts.ts",
      "--target",
      "ES2022",
      "--module",
      "commonjs",
      "--skipLibCheck",
      "--outDir",
      outDir,
    ],
    { cwd: process.cwd(), stdio: "inherit" },
  );

  const { buildParticipantDateEmail, formatDraftPhone } = require(join(outDir, "emailDrafts.js"));

  assert.equal(formatDraftPhone(" 555-0101 "), "555-0101");
  assert.equal(formatDraftPhone("   "), "phone not listed");
  assert.equal(formatDraftPhone(null), "phone not listed");

  const email = buildParticipantDateEmail("Anna", [
    { name: "Michael 1", phone: "555-0102" },
    { name: "Thomas 2", phone: "" },
  ]);

  assert.equal(email.subject, "Your curated dates — Summer 2026");
  assert.match(email.body, /Hello Anna,/);
  assert.match(email.body, /Your dates:/);
  assert.match(email.body, /1\. Michael 1 - 555-0102/);
  assert.match(email.body, /2\. Thomas 2 - phone not listed/);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
