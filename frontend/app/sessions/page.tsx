"use client";

import { CalendarDays, CheckCircle2, ClipboardCheck, FileText, Settings, UserCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AppShell } from "../../components/AppShell";
import { Modal } from "../../components/Modal";
import { useStore } from "../../lib/dataStore";

const WORKFLOW_STAGES = [
  { status: "Received", description: "Signup submitted; not yet reviewed by an organizer." },
  { status: "Fee pending", description: "Accepted in principle; waiting for payment confirmation." },
  { status: "Accepted", description: "Fee confirmed, statements signed, ready for matching." },
  { status: "Waitlisted", description: "Cohort full for this gender; queued for next opening." },
  { status: "Declined", description: "Reviewed and declined — not carried to matching." },
  { status: "Withdrawn", description: "Participant withdrew voluntarily." },
];

function pct(num: number, denom: number) {
  if (!denom) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

export default function SessionsPage() {
  const { sessions, addSession, updateSession } = useStore();
  const [currentId, setCurrentId] = useState(sessions[0]?.id ?? "");
  const current = sessions.find((s) => s.id === currentId) ?? sessions[0];

  const [showNew, setShowNew] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [sessionAdded, setSessionAdded] = useState(false);

  const [form, setForm] = useState({ name: "", window: "", deadline: "", men: "", women: "", notes: "", _id: "" });
  const [formError, setFormError] = useState("");

  function openNew() {
    setForm({ name: "", window: "", deadline: "", men: "", women: "", notes: "", _id: crypto.randomUUID() });
    setFormError("");
    setSessionAdded(false);
    setShowNew(true);
  }

  function submitSession() {
    if (!form.name.trim()) { setFormError("Session name is required."); return; }
    if (!form.window.trim()) { setFormError("Date window is required."); return; }
    setFormError("");
    addSession({
      id: form._id,
      name: form.name.trim(),
      window: form.window.trim(),
      deadline: form.deadline.trim() || "TBD",
      men: parseInt(form.men) || 0,
      women: parseInt(form.women) || 0,
      notes: form.notes.trim()
    });
    setCurrentId(form._id);
    setSessionAdded(true);
  }

  function toggleStatus(session: typeof sessions[0]) {
    const next = session.status === "Completed" ? "Registration open" : "Completed";
    updateSession(session.id, { status: next });
  }

  return (
    <AppShell active="/sessions">
      <header className="page-header">
        <div>
          <p className="eyebrow">Session operations</p>
          <h1>Program Sessions</h1>
          <p className="page-subtitle">
            Manage intake windows, registration review, orientation requirements, cohort balance, and trends.
          </p>
        </div>
        <div className="toolbar">
          <Link className="button-link" href="/forms/summer-2026"><FileText size={18} />Edit Intake</Link>
          <button className="primary" onClick={openNew} type="button">
            <CalendarDays size={18} />New Session
          </button>
        </div>
      </header>

      {showNew && (
        <Modal eyebrow="Session operations" title="Create New Session" onClose={() => setShowNew(false)} size="lg">
          {sessionAdded ? (
            <>
              <p style={{ marginTop: 14 }}>
                <CheckCircle2 size={16} style={{ color: "var(--green)", verticalAlign: "middle", marginRight: 6 }} />
                {form.name} created.
              </p>
              <div className="confirm-actions">
                <button onClick={() => setShowNew(false)} type="button">Close</button>
                <button className="primary" onClick={() => { setSessionAdded(false); setForm({ name: "", window: "", deadline: "", men: "", women: "", notes: "", _id: crypto.randomUUID() }); }} type="button">
                  Create Another
                </button>
              </div>
            </>
          ) : (
            <>
              {formError && <p style={{ color: "var(--ldc-red)", marginTop: 10 }}>{formError}</p>}
              <div className="form-grid">
                <label className="full">
                  Session name <span style={{ color: "var(--ldc-red)" }}>*</span>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Fall 2026" />
                </label>
                <label>
                  Date window <span style={{ color: "var(--ldc-red)" }}>*</span>
                  <input value={form.window} onChange={(e) => setForm((f) => ({ ...f, window: e.target.value }))} placeholder="e.g. Sep 1 - Nov 7" />
                </label>
                <label>
                  Registration deadline
                  <input value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} placeholder="e.g. Aug 15" />
                </label>
                <label>
                  Men target
                  <input type="number" min={0} value={form.men} onChange={(e) => setForm((f) => ({ ...f, men: e.target.value }))} placeholder="e.g. 40" />
                </label>
                <label>
                  Women target
                  <input type="number" min={0} value={form.women} onChange={(e) => setForm((f) => ({ ...f, women: e.target.value }))} placeholder="e.g. 45" />
                </label>
                <label className="full">
                  Notes
                  <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </label>
              </div>
              <div className="confirm-actions">
                <button onClick={() => setShowNew(false)} type="button">Cancel</button>
                <button className="primary" onClick={submitSession} type="button">
                  <CalendarDays size={16} />Create
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {showWorkflow && (
        <Modal eyebrow="Registration pipeline" title="Workflow States" onClose={() => setShowWorkflow(false)}>
          <div className="role-list">
            {WORKFLOW_STAGES.map((s) => (
              <div className="role-item" key={s.status}>
                <strong>{s.status}</strong>
                <span>{s.description}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {current && (
        <section className="status-strip">
          <div className="status-card important">
            <span>Active session ▾</span>
            <strong style={{ fontSize: 15 }}>
              <select
                value={currentId}
                onChange={(e) => setCurrentId(e.target.value)}
                style={{ background: "none", border: "1px solid var(--line)", borderRadius: 6, color: "var(--ldc-blue)", fontWeight: 900, fontSize: 15, padding: "2px 4px", width: "100%" }}
              >
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </strong>
            <small>{current.window}</small>
          </div>
          <div className="status-card">
            <span>Registrations</span>
            <strong>{current.size}</strong>
            <small>{current.men}m / {current.women}f (capacity target)</small>
          </div>
          <div className="status-card">
            <span>Repeat men</span>
            <strong>{pct(current.repeatMen, current.men)}</strong>
            <small>from session record</small>
          </div>
          <div className="status-card">
            <span>Repeat women</span>
            <strong>{pct(current.repeatWomen, current.women)}</strong>
            <small>from session record</small>
          </div>
        </section>
      )}

      <section className="content-grid">
        <div className="panel span-2">
          <div className="section-head">
            <div>
              <p className="eyebrow">All sessions</p>
              <h2>Cohort Timeline</h2>
            </div>
            <button onClick={() => setShowWorkflow(true)} type="button">
              <Settings size={18} />Workflow
            </button>
          </div>
          <div className="data-table">
            <div className="data-row data-head">
              <span>Session</span>
              <span>Dates</span>
              <span>Size and balance</span>
              <span>Status</span>
            </div>
            {sessions.map((session) => (
              <div className="data-row" key={session.id}>
                <span>
                  <strong>{session.name}</strong>
                  <small>Deadline: {session.deadline}</small>
                </span>
                <span>{session.window}</span>
                <span>
                  {session.size} total · {session.men}m / {session.women}f
                  <small>{session.notes}</small>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className={session.status === "Completed" ? "status-pill" : "status-pill warning"}>
                    {session.status}
                  </span>
                  <button
                    onClick={() => toggleStatus(session)}
                    style={{ fontSize: 11, minHeight: 24, padding: "2px 8px" }}
                    title={session.status === "Completed" ? "Reopen registration for this session" : "Mark session as complete — no effect on matching"}
                    type="button"
                  >
                    {session.status === "Completed" ? "Reopen" : "Mark Complete"}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Reminders — manage individuals in Participants</p>
              <h2>Registration Steps</h2>
            </div>
            <ClipboardCheck size={20} />
          </div>
          <div className="check-list">
            <span><CheckCircle2 size={17} />Set each person's status: Accepted, Waitlisted, or Declined</span>
            <span><UserCheck size={17} />Confirm orientation RSVP for first-time participants</span>
            <span><UsersRound size={17} />Check repeat % for gender balance trends</span>
            <span><FileText size={17} />Review feedback from prior sessions before re-inviting</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
            Individual registrations are managed in the <Link href="/participants" style={{ color: "var(--ldc-blue)" }}>Participants</Link> page. Use the status filter to view by category.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
