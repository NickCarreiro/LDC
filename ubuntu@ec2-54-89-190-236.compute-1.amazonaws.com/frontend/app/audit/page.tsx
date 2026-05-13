"use client";

import { CheckCircle2, Download, Eye, FileText, LockKeyhole, Mail, ShieldCheck, UserCheck, X } from "lucide-react";
import { useState } from "react";

import { AppShell } from "../../components/AppShell";
import { Modal } from "../../components/Modal";
import { useStore } from "../../lib/dataStore";

function loadSmtp() {
  if (typeof window === "undefined") return { fromEmail: "", fromName: "Little Dates Club", appPassword: "", port: "587" };
  try {
    const raw = localStorage.getItem("ldc_smtp");
    return raw ? JSON.parse(raw) : { fromEmail: "", fromName: "Little Dates Club", appPassword: "", port: "587" };
  } catch { return { fromEmail: "", fromName: "Little Dates Club", appPassword: "", port: "587" }; }
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
  const { auditEvents } = useStore();
  const [showRoles, setShowRoles] = useState(false);
  const [auditLimit, setAuditLimit] = useState(50);

  // SMTP config — loaded from localStorage, saved on explicit Save
  const [smtp, setSmtp] = useState(loadSmtp);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [pwError, setPwError] = useState("");

  function handleSmtpChange(key: string, val: string) {
    setSmtp((prev: typeof smtp) => ({ ...prev, [key]: val }));
    setSmtpSaved(false);
    setTestStatus("idle");
    if (key === "appPassword") setPwError("");
  }

  function testConnection() {
    const cleaned = smtp.appPassword.replace(/\s/g, "");
    if (!smtp.fromEmail) { setTestStatus("fail"); return; }
    if (cleaned.length !== 16) {
      setPwError("Gmail app passwords are exactly 16 characters.");
      setTestStatus("fail");
      return;
    }
    setPwError("");
    setTestStatus("testing");
    // Real SMTP test requires a server-side call; flag as not yet wired
    setTimeout(() => {
      setTestStatus("fail");
      setPwError("Live connection test requires the backend SMTP relay to be running.");
    }, 1200);
  }

  function saveSmtp() {
    if (!smtp.fromEmail || !smtp.appPassword) return;
    try { localStorage.setItem("ldc_smtp", JSON.stringify(smtp)); } catch { /* quota */ }
    setSmtpSaved(true);
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
            Host: smtp.gmail.com · Use a Gmail App Password, not your account password. Generate one at myaccount.google.com → Security → App passwords.
          </p>
          <div className="confirm-actions">
            <button onClick={testConnection} type="button">Test Connection</button>
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
