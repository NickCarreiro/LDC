"use client";

import { CheckCircle2, Database, Download, Eye, FileText, LockKeyhole, Mail, ShieldCheck, Trash2, Upload, UserCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "../../components/AppShell";
import { Modal } from "../../components/Modal";
import { useStore } from "../../lib/dataStore";
import { parseParticipantImportFile, type ImportParticipantRow } from "../../lib/importParticipants";

function loadSmtp() {
  if (typeof window === "undefined") return { host: "smtp.gmail.com", fromEmail: "", fromName: "Little Dates Club", appPassword: "", port: "587" };
  try {
    const raw = localStorage.getItem("ldc_smtp");
    return raw ? { host: "smtp.gmail.com", ...JSON.parse(raw) } : { host: "smtp.gmail.com", fromEmail: "", fromName: "Little Dates Club", appPassword: "", port: "587" };
  } catch { return { host: "smtp.gmail.com", fromEmail: "", fromName: "Little Dates Club", appPassword: "", port: "587" }; }
}

const ROLES = [
  { name: "super_admin", label: "Super Admin", description: "Full read/write access to all participants, sessions, matches, audit logs, and role configuration." },
  { name: "organizer", label: "Organizer", description: "Can create and edit participants, sessions, and registrations. Can approve matches and generate email drafts." },
  { name: "matcher", label: "Matcher", description: "Can run dry-run scoring, create match drafts, and prepare email drafts. Cannot create participants or sessions." },
  { name: "reviewer", label: "Reviewer", description: "Read-only access to participants and sessions. Can view audit logs. Cannot approve matches or send emails." },
  { name: "readonly", label: "Read Only", description: "Read-only access to non-sensitive fields only." },
];

const ACTION_LABELS: Record<string, string> = {
  "participant.create": "Added participant",
  "participant.update": "Updated profile",
  "participant.view": "Viewed participant",
  "participant.view_sensitive": "Viewed sensitive record",
  "participant.export_csv": "Exported participant CSV",
  "participant.list": "Listed participants",
  "session.create": "Created session",
  "session.list": "Listed sessions",
  "match.draft.create": "Created match draft",
  "match.draft.update": "Updated match draft",
  "match.draft.remove": "Removed match draft",
  "match.recommendations.create": "Generated recommendations",
  "email_drafts.generate": "Generated email drafts",
  "email.send_batch": "Sent batch emails",
  "registration.statement_signed": "Statement signed",
};

function humanAction(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export default function AuditPage() {
  const {
    auditEvents,
    sessions,
    participants,
    matchDrafts,
    addSession,
    importParticipants,
    clearParticipantData,
    clearAllOperationalData,
  } = useStore();
  const [showRoles, setShowRoles] = useState(false);
  const [auditLimit, setAuditLimit] = useState(50);
  const [clearMode, setClearMode] = useState<"participants" | "all" | null>(null);
  const [clearConfirm, setClearConfirm] = useState("");
  const [importSession, setImportSession] = useState(sessions[0]?.name ?? "Imported File");
  const [importRows, setImportRows] = useState<ImportParticipantRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const [detectedSessionName, setDetectedSessionName] = useState("");

  // SMTP config — loaded from localStorage, saved on explicit Save
  const [smtp, setSmtp] = useState(loadSmtp);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [pwError, setPwError] = useState("");
  const [relayMessage, setRelayMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("ldc_smtp")) return;
    fetch("/api/smtp/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((config) => {
        if (!config) return;
        setSmtp((prev: typeof smtp) => ({
          ...prev,
          fromEmail: config.fromEmail || prev.fromEmail,
          fromName: config.fromName || prev.fromName,
          host: config.host || prev.host,
          appPassword: config.appPassword || prev.appPassword,
          port: config.port || prev.port,
        }));
      })
      .catch(() => {});
  }, []);

  function handleSmtpChange(key: string, val: string) {
    setSmtp((prev: typeof smtp) => ({ ...prev, [key]: val }));
    setSmtpSaved(false);
    setTestStatus("idle");
    setRelayMessage("");
    if (key === "appPassword") setPwError("");
  }

  async function testConnection() {
    const cleaned = smtp.appPassword.replace(/\s/g, "");
    if (!smtp.host || !smtp.fromEmail) {
      setRelayMessage("SMTP host and Gmail address are required.");
      setTestStatus("fail");
      return;
    }
    if (cleaned.length !== 16) {
      setPwError("Gmail app passwords are exactly 16 characters.");
      setTestStatus("fail");
      return;
    }
    setPwError("");
    setTestStatus("testing");
    try {
      const res = await fetch("/api/smtp/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: smtp.host,
          port: smtp.port,
          fromEmail: smtp.fromEmail,
          username: smtp.fromEmail,
          appPassword: smtp.appPassword,
        }),
      });
      const status = await res.json();
      if (!res.ok || !status.ok) {
        setTestStatus("fail");
        setRelayMessage(status.error || "SMTP relay did not answer.");
        return;
      }
      setTestStatus("ok");
      setRelayMessage(status.tls ? "Relay is reachable and advertises TLS." : "Relay is reachable.");
    } catch {
      setTestStatus("fail");
      setRelayMessage("Could not reach the SMTP relay from the server.");
    }
  }

  function saveSmtp() {
    if (!smtp.fromEmail || !smtp.appPassword) return;
    try { localStorage.setItem("ldc_smtp", JSON.stringify(smtp)); } catch { /* quota */ }
    setSmtpSaved(true);
  }

  async function handleImportFile(file: File | null) {
    setImportStatus("");
    setImportRows([]);
    setImportHeaders([]);
    setDetectedSessionName("");
    if (!file) return;
    try {
      const parsed = await parseParticipantImportFile(file, importSession);
      if (parsed.detectedSessionName) {
        setImportSession(parsed.detectedSessionName);
        setDetectedSessionName(parsed.detectedSessionName);
      }
      setImportHeaders(parsed.headers);
      setImportRows(parsed.rows);
      setImportStatus(
        `Parsed ${parsed.rawRowCount} row${parsed.rawRowCount === 1 ? "" : "s"}; ` +
        `mapped ${parsed.rows.length} participant${parsed.rows.length === 1 ? "" : "s"}` +
        (parsed.detectedSessionName ? `; detected session ${parsed.detectedSessionName}` : "") +
        (parsed.skippedRowCount ? `; skipped ${parsed.skippedRowCount} blank/unusable row${parsed.skippedRowCount === 1 ? "" : "s"}.` : "."),
      );
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Could not read that import file.");
    }
  }

  function handleImportSessionChange(name: string) {
    setImportSession(name);
    setImportRows((rows) => rows.map((row) => ({ ...row, sessions: [name] })));
  }

  function ensureImportSession() {
    if (!importSession || sessions.some((session) => session.name === importSession)) return false;
    const men = importRows.filter((row) => /^(male|man)$/i.test(row.gender)).length;
    const women = importRows.filter((row) => /^(female|woman)$/i.test(row.gender)).length;
    addSession({
      id: `import-session-${importSession.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}`,
      name: importSession,
      window: importSession,
      deadline: "TBD",
      men,
      women,
      notes: `Auto-created from participant import. ${importRows.length} imported participant${importRows.length === 1 ? "" : "s"}.`,
    });
    return true;
  }

  function commitImport() {
    const createdSession = ensureImportSession();
    const count = importParticipants(importRows, importSession);
    setImportRows([]);
    setImportHeaders([]);
    setDetectedSessionName("");
    setImportStatus(`Imported ${count} participants into ${importSession}${createdSession ? " and created the session" : ""}.`);
  }

  function confirmClear() {
    if (clearConfirm !== "CLEAR") return;
    if (clearMode === "participants") clearParticipantData();
    if (clearMode === "all") clearAllOperationalData();
    setClearMode(null);
    setClearConfirm("");
  }

  const auditCsv = [
    "actor,action,object,sensitivity,time",
    ...auditEvents.map((e) =>
      [e.actor, e.action, e.object, e.sensitivity, e.time].join(",")
    )
  ].join("\n");

  return (
    <AppShell active="/audit">
      <header className="page-header">
        <div>
          <p className="eyebrow">Access log</p>
          <h1>Audit and Access Control</h1>
          <p className="page-subtitle">Who did what and when. CSV export, role definitions, and organizer action history.</p>
        </div>
        <div className="toolbar">
          <button
            onClick={() => {
              const blob = new Blob([auditCsv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "ldc-audit-log.csv";
              document.body.appendChild(a); a.click(); a.remove();
              URL.revokeObjectURL(url);
            }}
            type="button"
          >
            <Download size={18} />Export Audit Log
          </button>
          <button className="primary" onClick={() => setShowRoles(true)} type="button">
            <LockKeyhole size={18} />Review Roles
          </button>
        </div>
      </header>

      {showRoles && (
        <Modal eyebrow="Access control" title="Role Definitions" onClose={() => setShowRoles(false)}>
          <div className="role-list">
            {ROLES.map((role) => (
              <div className="role-item" key={role.name}>
                <strong>{role.name}</strong>
                <span>{role.description}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {clearMode && (
        <Modal
          eyebrow="Data management"
          title={clearMode === "all" ? "Clear Sessions and Participant Data" : "Clear Participant Data"}
          onClose={() => { setClearMode(null); setClearConfirm(""); }}
        >
          <p style={{ marginTop: 12 }}>
            {clearMode === "all"
              ? "This clears browser-side sessions, participants, match drafts, generated emails, and display names."
              : "This clears browser-side participants, match drafts, generated emails, and display names while keeping sessions."}
          </p>
          <p style={{ color: "var(--ldc-red)", fontSize: 13, marginTop: 10 }}>
            This does not create a backup. Export anything you need before continuing.
          </p>
          <label style={{ display: "block", marginTop: 14 }}>
            Type CLEAR to confirm
            <input value={clearConfirm} onChange={(e) => setClearConfirm(e.target.value)} />
          </label>
          <div className="confirm-actions">
            <button onClick={() => { setClearMode(null); setClearConfirm(""); }} type="button">
              Cancel
            </button>
            <button className="primary" disabled={clearConfirm !== "CLEAR"} onClick={confirmClear} type="button">
              <Trash2 size={16} />Clear Data
            </button>
          </div>
        </Modal>
      )}

      <section className="status-strip">
        <div className="status-card"><span>Total events</span><strong>{auditEvents.length}</strong><small>since last page load</small></div>
        <div className="status-card">
          <span>Sensitive record views</span>
          <strong>{auditEvents.filter((e) => e.action.includes("view") || e.action.includes("sensitive")).length}</strong>
          <small>since last page load</small>
        </div>
        <div className="status-card"><span>CSV exports</span><strong>{auditEvents.filter(e => e.action.includes("csv") || e.action.includes("export")).length}</strong></div>
        <div className="status-card"><span>Email actions</span><strong>{auditEvents.filter(e => e.action.includes("email") || e.action.includes("send")).length}</strong></div>
      </section>

      <section className="content-grid">
        <div className="panel span-2">
          <div className="section-head">
            <div><p className="eyebrow">Event stream</p><h2>Recent Audit Events</h2></div>
            <Eye size={20} />
          </div>
          <div className="data-table">
            <div className="data-row data-head">
              <span>Actor</span><span>Action</span><span>Object and sensitivity</span><span>Time</span>
            </div>
            {auditEvents.slice(0, auditLimit).map((event, i) => (
              <div className="data-row" key={`${event.action}-${event.time}-${i}`}>
                <span><strong>{event.actor}</strong></span>
                <span>{humanAction(event.action)}</span>
                <span><strong>{event.object}</strong><small>{event.sensitivity}</small></span>
                <span>{event.time}</span>
              </div>
            ))}
            {auditEvents.length > auditLimit && (
              <div style={{ padding: "10px 0", textAlign: "center" }}>
                <button onClick={() => setAuditLimit((n) => n + 50)} type="button" style={{ fontSize: 13 }}>
                  Show more ({auditEvents.length - auditLimit} remaining)
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="panel">
          <div className="section-head">
            <div><p className="eyebrow">Controls</p><h2>What's Tracked</h2></div>
            <ShieldCheck size={20} />
          </div>
          <div className="check-list">
            <span><UserCheck size={17} />Participant views and edits</span>
            <span><LockKeyhole size={17} />Private field access</span>
            <span><FileText size={17} />Safety and liability acknowledgements</span>
            <span><Download size={17} />CSV exports</span>
          </div>
        </aside>
      </section>

      <section className="content-grid" style={{ marginTop: 14 }}>
        <div className="panel span-2">
          <div className="section-head">
            <div>
              <p className="eyebrow">Imports and cleanup</p>
              <h2>Data Management</h2>
            </div>
            <Database size={20} />
          </div>
          <div className="status-strip" style={{ marginBottom: 14 }}>
            <div className="status-card"><span>Participants</span><strong>{participants.length}</strong></div>
            <div className="status-card"><span>Sessions</span><strong>{sessions.length}</strong></div>
            <div className="status-card"><span>Match drafts</span><strong>{matchDrafts.length}</strong></div>
          </div>
          <div className="form-grid">
            <label>
              Import into session
              <select value={importSession} onChange={(e) => handleImportSessionChange(e.target.value)}>
                {sessions.length === 0 && <option>Imported File</option>}
                {importSession && !sessions.some((session) => session.name === importSession) && (
                  <option value={importSession}>
                    {importSession}{detectedSessionName === importSession ? " (detected)" : " (new)"}
                  </option>
                )}
                {sessions.map((session) => (
                  <option key={session.id} value={session.name}>{session.name}</option>
                ))}
              </select>
            </label>
            <label>
              Participant CSV or XLSX
              <input
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                type="file"
                onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {importStatus && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>{importStatus}</p>}
          {importHeaders.length > 0 && (
            <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>
              Headers detected: {importHeaders.slice(0, 12).join(", ")}
              {importHeaders.length > 12 ? "…" : ""}
            </p>
          )}
          {importRows.length > 0 && (
            <div className="data-table" style={{ marginTop: 12 }}>
              <div className="data-row data-head">
                <span>Name</span><span>Contact</span><span>Session</span><span>Status</span>
              </div>
              {importRows.slice(0, 6).map((row, index) => (
                <div className="data-row" key={`${row.email}-${index}`}>
                  <span><strong>{row.firstName} {row.lastName}</strong><small>{row.gender}, {row.age || "age ?"}</small></span>
                  <span>{row.email || "No email"}<small>{row.phone}</small></span>
                  <span>{row.sessions?.join(", ") || importSession}</span>
                  <span>{row.status}</span>
                </div>
              ))}
            </div>
          )}
          <div className="confirm-actions">
            <button disabled={importRows.length === 0} onClick={commitImport} type="button">
              <Upload size={16} />Import Previewed Rows
            </button>
            <button onClick={() => { setClearMode("participants"); setClearConfirm(""); }} type="button">
              <Trash2 size={16} />Clear Participant Data
            </button>
            <button className="primary" onClick={() => { setClearMode("all"); setClearConfirm(""); }} type="button">
              <Trash2 size={16} />Clear Sessions Too
            </button>
          </div>
        </div>

        <aside className="panel">
          <div className="section-head">
            <div><p className="eyebrow">Import mapping</p><h2>Accepted Fields</h2></div>
          </div>
          <div className="check-list">
            <span><CheckCircle2 size={17} />Name or first/last name</span>
            <span><CheckCircle2 size={17} />Email and phone</span>
            <span><CheckCircle2 size={17} />Gender, age, location</span>
            <span><CheckCircle2 size={17} />Interests, desired dates, age range</span>
            <span><CheckCircle2 size={17} />Vision, status, fee, notes</span>
          </div>
        </aside>
      </section>

      {/* SMTP Configuration */}
      <section className="content-grid" style={{ marginTop: 14 }}>
        <div className="panel span-2">
          <div className="section-head">
            <div>
              <p className="eyebrow">Email delivery</p>
              <h2>SMTP — Gmail</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {testStatus === "ok" && <span className="smtp-test-badge ok"><CheckCircle2 size={14} />Connected</span>}
              {testStatus === "fail" && <span className="smtp-test-badge fail"><X size={14} />Failed</span>}
              {testStatus === "testing" && <span className="smtp-test-badge pending">Testing…</span>}
              {smtpSaved && testStatus === "idle" && <span className="smtp-test-badge ok">Saved</span>}
              <Mail size={20} />
            </div>
          </div>
          <div className="form-grid">
            <label>
              SMTP host
              <input
                placeholder="smtp.gmail.com"
                value={smtp.host}
                onChange={(e) => handleSmtpChange("host", e.target.value)}
              />
            </label>
            <label>
              Gmail address (from / username)
              <input
                type="email"
                placeholder="yourclub@gmail.com"
                value={smtp.fromEmail}
                onChange={(e) => handleSmtpChange("fromEmail", e.target.value)}
              />
            </label>
            <label>
              App password
              <input
                type="password"
                placeholder="16-character app password"
                value={smtp.appPassword}
                onChange={(e) => handleSmtpChange("appPassword", e.target.value)}
                autoComplete="new-password"
              />
              {pwError && <p style={{ color: "var(--ldc-red)", fontSize: 12, marginTop: 4 }}>{pwError}</p>}
            </label>
            <label>
              From display name
              <input
                value={smtp.fromName}
                onChange={(e) => handleSmtpChange("fromName", e.target.value)}
              />
            </label>
            <label>
              Port
              <select value={smtp.port} onChange={(e) => handleSmtpChange("port", e.target.value)}>
                <option value="587">587 (TLS — recommended)</option>
                <option value="465">465 (SSL)</option>
              </select>
            </label>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, marginBottom: 0 }}>
            Use a Gmail App Password, not your account password. Generate one at myaccount.google.com → Security → App passwords.
          </p>
          {relayMessage && (
            <p style={{ color: testStatus === "ok" ? "var(--green)" : "var(--ldc-red)", fontSize: 12, marginTop: 8 }}>
              {relayMessage}
            </p>
          )}
          <div className="confirm-actions">
            <button disabled={testStatus === "testing"} onClick={() => void testConnection()} type="button">
              {testStatus === "testing" ? "Checking Relay..." : "Check Relay"}
            </button>
            <button className="primary" onClick={saveSmtp} type="button">Save</button>
          </div>
        </div>

        <aside className="panel">
          <div className="section-head">
            <div><p className="eyebrow">Gmail setup</p><h2>Instructions</h2></div>
          </div>
          <div className="check-list">
            <span><CheckCircle2 size={17} />Enable 2-Step Verification on the Gmail account</span>
            <span><CheckCircle2 size={17} />Go to myaccount.google.com → Security → App passwords</span>
            <span><CheckCircle2 size={17} />Create an app password for "Mail"</span>
            <span><CheckCircle2 size={17} />Paste the 16-character password above</span>
            <span><CheckCircle2 size={17} />Use port 587 with STARTTLS</span>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
