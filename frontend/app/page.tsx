"use client";

import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  HeartHandshake,
  LockKeyhole,
  Mail,
  MapPin,
  Search,
  Sparkles,
  UserCheck,
  UsersRound,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ActionButton } from "../components/ActionButton";
import { AppShell } from "../components/AppShell";
import { Modal } from "../components/Modal";
import { useStore } from "../lib/dataStore";
import { describeConflicts, scoreParticipants } from "../lib/operationsData";


const operations = [
  {
    title: "Intake Form",
    text: "Manage the Summer 2026 signup form and field mapping.",
    href: "/forms/summer-2026",
    icon: FileText
  },
  {
    title: "Registration Review",
    text: "Accept, waitlist, or decline participants and track fee status.",
    href: "/sessions",
    icon: UserCheck
  },
  {
    title: "Manual Matching",
    text: "Curate pairs, dry-run compatibility, and check prior history.",
    href: "/matching",
    icon: HeartHandshake
  },
  {
    title: "Export and Audit",
    text: "Export CSVs and review the access log.",
    href: "/audit",
    icon: LockKeyhole
  }
];

export default function OperationsDashboard() {
  const { participants, sessions, matchDrafts, updateDraftStatus, keywords } = useStore();
  const women = participants.filter((p) => p.gender === "Woman");
  const men = participants.filter((p) => p.gender === "Man");
  const [primary, setPrimary] = useState(women[0]?.id ?? "");
  const [secondary, setSecondary] = useState(men[0]?.id ?? "");
  const [approveOpen, setApproveOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [approved, setApproved] = useState(false);

  const participantA = participants.find((p) => p.id === primary);
  const participantB = participants.find((p) => p.id === secondary);
  const result = useMemo(() => {
    if (!participantA || !participantB) return null;
    return scoreParticipants(participantA, participantB, keywords);
  }, [participantA, participantB, keywords]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentSession = sessions[0];
  const feePending = participants.filter((p) => p.fee === "pending" || p.status === "Fee pending");
  const needsReview = participants.filter((p) => p.special);
  const draftMatches = matchDrafts.filter((d) => d.status === "Draft" || d.status === "Needs review");
  const emailsReady = matchDrafts.filter((d) => d.email === "Ready" && d.status === "Approved");
  const pendingDrafts = draftMatches;

  const dashboardCsv = [
    "name,status,desired_dates,fee",
    ...participants.map((p) => `${p.name},${p.status},${p.desiredDates},${p.fee}`)
  ].join("\n");

  function handleApprove() {
    Object.entries(checked).forEach(([pair, isChecked]) => {
      if (isChecked) updateDraftStatus(pair, "Approved");
    });
    setApproved(true);
  }

  function openApprove() {
    const initial: Record<string, boolean> = {};
    pendingDrafts.forEach((d) => { initial[d.pair] = false; });
    setChecked(initial);
    setApproved(false);
    setApproveOpen(true);
  }

  return (
    <AppShell active="/">
      <header className="page-header">
        <div>
          <p className="eyebrow">Organizer console</p>
          <h1>Summer 2026</h1>
          <p className="page-subtitle">
            {currentSession?.window} · Deadline {currentSession?.deadline}
          </p>
        </div>
        <div className="toolbar">
          <ActionButton
            action="Search operations"
            kind="search"
            results={participants.map((p) => `${p.name} — ${p.status}, wants ${p.desiredDates} dates`)}
          >
            <Search size={18} />Search
          </ActionButton>
          <Link className="button-link" href="/forms/summer-2026"><FileText size={18} />Organizer Form View</Link>
          <ActionButton action="Dashboard CSV export" csvData={dashboardCsv} filename="ldc-dashboard-export.csv" kind="download">
            <Download size={18} />Export Participants CSV
          </ActionButton>
          <button className="primary" onClick={openApprove} type="button">
            <CheckCircle2 size={18} />
            Approve Drafts{pendingDrafts.length > 0 ? ` (${pendingDrafts.length})` : ""}
          </button>
        </div>
      </header>

      {approveOpen && (
        <Modal eyebrow="Curation sheet" title="Approve Draft Matches" onClose={() => setApproveOpen(false)}>
          {approved ? (
            <>
              <p>Approved. Go to Draft Emails to generate and send.</p>
              <div className="confirm-actions">
                <Link className="button-link primary" href="/drafts">Go to Draft Emails</Link>
              </div>
            </>
          ) : pendingDrafts.length === 0 ? (
            <p style={{ marginTop: 14 }}>No pairs are in Draft or Needs-review status. Use Match Workbench to create pairs, then return here to approve them.</p>
          ) : (
            <>
              <div className="draft-approval-list">
                {pendingDrafts.map((d) => (
                  <div className="draft-approval-item" key={d.pair}>
                    <input
                      id={`approve-${d.pair}`}
                      type="checkbox"
                      checked={!!checked[d.pair]}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [d.pair]: e.target.checked }))}
                    />
                    <label htmlFor={`approve-${d.pair}`}>
                      {d.pair}
                      <small style={{ display: "block", marginTop: 2 }}>Score {d.score} · {d.warnings.join(", ")}</small>
                    </label>
                    <small>{d.status}</small>
                  </div>
                ))}
              </div>
              <div className="confirm-actions">
                <button onClick={() => setApproveOpen(false)} type="button">Cancel</button>
                <button
                  className="primary"
                  disabled={!Object.values(checked).some(Boolean)}
                  onClick={handleApprove}
                  type="button"
                >
                  <CheckCircle2 size={16} />Approve Selected
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      <section className="status-strip" aria-label="Session status">
        <div className="status-card important">
          <span>Men registered</span>
          <strong>{men.length}</strong>
          <small>{men.filter(p => p.status === "Accepted").length} accepted</small>
        </div>
        <div className="status-card">
          <span>Women registered</span>
          <strong>{women.length}</strong>
          <small>{women.filter(p => p.status === "Accepted").length} accepted</small>
        </div>
        <div className="status-card important">
          <span>Fee pending</span>
          <strong>{feePending.length}</strong>
          <small>{feePending.length === 0 ? "all clear" : "need payment confirmation"}</small>
        </div>
        <div className="status-card">
          <span>Pending approval</span>
          <strong>{draftMatches.length}</strong>
          <small>{matchDrafts.filter(d => d.status === "Approved").length} already approved · {emailsReady.length} email{emailsReady.length !== 1 ? "s" : ""} ready</small>
        </div>
      </section>

      {/* Workflow guide */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "10px 14px", background: "#f4f6f8", border: "1px solid var(--line)", borderRadius: 8, marginTop: 14, fontSize: 13, flexWrap: "wrap" }}>
        <strong style={{ color: "var(--ldc-blue)", marginRight: 4 }}>Workflow:</strong>
        <span style={{ color: "var(--muted)" }}>1 · Review registrations in Sessions</span>
        <span style={{ color: "var(--line)", padding: "0 4px" }}>→</span>
        <span style={{ color: "var(--muted)" }}>2 · Manage participants</span>
        <span style={{ color: "var(--line)", padding: "0 4px" }}>→</span>
        <span style={{ color: "var(--muted)" }}>3 · Curate pairs in Match Workbench</span>
        <span style={{ color: "var(--line)", padding: "0 4px" }}>→</span>
        <span style={{ color: "var(--muted)" }}>4 · Approve drafts here</span>
        <span style={{ color: "var(--line)", padding: "0 4px" }}>→</span>
        <span style={{ color: "var(--muted)" }}>5 · Generate &amp; send emails in Draft Emails</span>
      </div>

      <section className="feature-grid">
        {operations.map((item) => {
          const Icon = item.icon;
          return (
            <Link className="feature-card" href={item.href} key={item.title}>
              <Icon size={22} />
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </Link>
          );
        })}
      </section>

      <section className="queue-grid">
        <article className="queue-card">
          <ClipboardCheck size={20} />
          <span>Total participants</span>
          <strong>{participants.length}</strong>
          <small>{participants.filter(p => p.status === "Accepted").length} accepted</small>
        </article>
        <article className="queue-card">
          <AlertTriangle size={20} />
          <span>Needs organizer review</span>
          <strong>{needsReview.length}</strong>
          <small>private notes on file</small>
        </article>
        <article className="queue-card">
          <Sparkles size={20} />
          <span>Pending match drafts</span>
          <strong>{draftMatches.length}</strong>
          <small>{matchDrafts.filter(d => d.status === "Approved").length} approved</small>
        </article>
        <article className="queue-card">
          <Mail size={20} />
          <span>Emails ready</span>
          <strong>{emailsReady.length}</strong>
          <small>approved, generated, unsent</small>
        </article>
      </section>

      <section className="content-grid" id="participants">
        <div className="panel span-2">
          <div className="section-head">
            <div>
              <p className="eyebrow">Participant review</p>
              <h2>Registered Participants</h2>
            </div>
            <Link className="button-link" href="/participants"><UsersRound size={18} />Manage</Link>
          </div>
          <div className="data-table">
            <div className="data-row data-head">
              <span>Participant</span>
              <span>Location</span>
              <span>Notes</span>
              <span>Status</span>
            </div>
            {participants.slice(0, 6).map((participant) => (
              <div className="data-row" key={participant.id}>
                <span>
                  <strong>{participant.name}</strong>
                  <small>{participant.gender}, {participant.age} · wants {participant.desiredDates} dates</small>
                </span>
                <span>
                  <MapPin size={15} />
                  {participant.location}
                </span>
                <span className="tag-wrap">
                  {participant.fee === "pending" && <i>Fee pending</i>}
                  {participant.special && <i>Review</i>}
                  {participant.fee !== "pending" && !participant.special && <i>—</i>}
                </span>
                <span className={participant.special ? "status-pill warning" : "status-pill"}>
                  {participant.special ? "Organizer review" : participant.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" id="audit">
          <div className="section-head">
            <div>
              <p className="eyebrow">Reminders — not tracked here</p>
              <h2>Before Matching</h2>
            </div>
          </div>
          <div className="check-list">
            <span><CheckCircle2 size={17} />Conduct acknowledgement collected from all participants</span>
            <span><CheckCircle2 size={17} />Safety statement collected from all participants</span>
            <span><CheckCircle2 size={17} />Liability statement collected from all participants</span>
            <span><AlertTriangle size={17} />Cannot-date constraints entered in each profile</span>
            <span><AlertTriangle size={17} />Special-needs flags reviewed in each profile</span>
          </div>
        </div>
      </section>

      <section className="content-grid" id="matching">
        <div className="panel match-workbench">
          <div className="section-head">
            <div>
              <p className="eyebrow">Dry run</p>
              <h2>Vision and Interest Match</h2>
            </div>
          </div>
          <div className="selectors">
            <label>
              Woman
              <select value={primary} onChange={(e) => setPrimary(e.target.value)}>
                {women.map((p) => (
                  <option value={p.id} key={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label>
              Man
              <select value={secondary} onChange={(e) => setSecondary(e.target.value)}>
                {men.map((p) => (
                  <option value={p.id} key={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>

          {result && (
            <div className="score-panel">
              <div>
                <span>Advisory score <small style={{ fontWeight: 400 }}>(0 = no match · 100 = ideal)</small></span>
                <strong>{result.score}</strong>
              </div>
              <p>Shared interests: {result.sharedInterests.join(", ") || "none"}</p>
              <p>Shared vision tags: {result.sharedVision.join(", ") || "none"}</p>
              {describeConflicts(result.a, result.b).map((c) => (
                <p key={c.label} style={{ color: c.severity === "block" ? "var(--ldc-red)" : "var(--warning)", fontWeight: c.severity === "block" ? 700 : 400, marginBottom: 4 }}>
                  {c.label}: {c.detail}
                </p>
              ))}
              {!result.priorDate && !result.blocked && <p>No conflicts.</p>}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Curation sheet</p>
              <h2>Draft Matches</h2>
            </div>
            <Sparkles size={20} />
          </div>
          <div className="draft-list">
            {matchDrafts.slice(0, 4).map((d) => (
              <div className={d.status === "Needs review" ? "draft-item warning" : "draft-item"} key={d.pair}>
                <span>{d.pair}</span>
                <strong>{d.status === "Approved" ? d.score : d.status === "Sent" ? "Sent" : d.status}</strong>
              </div>
            ))}
            {matchDrafts.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>No drafts yet.</p>
            )}
          </div>
        </div>

        <div className="panel span-2">
          <div className="section-head">
            <div>
              <p className="eyebrow">Longitudinal</p>
              <h2>Session Trends</h2>
            </div>
            <BarChart3 size={20} />
          </div>
          <div className="trend-grid">
            {sessions.map((session, i) => {
              const repM = session.men > 0 ? Math.round((session.repeatMen / session.men) * 100) : 0;
              const repW = session.women > 0 ? Math.round((session.repeatWomen / session.women) * 100) : 0;
              const barW = session.size > 0 ? (session.men / session.size) * 100 : 50;
              return (
                <article className="trend-card" key={`${session.name}-${i}`}>
                  <strong>{session.name}</strong>
                  <span>{session.size} participants</span>
                  <div className="bar" aria-hidden="true">
                    <i style={{ width: `${barW}%` }} />
                  </div>
                  <small>
                    {session.men}m / {session.women}f · Repeat {repM}% / {repW}%
                  </small>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
