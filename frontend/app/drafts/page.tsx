"use client";

import { CheckCircle2, Clock, Mail, Save, Send, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../../components/AppShell";
import { Modal } from "../../components/Modal";
import { useStore } from "../../lib/dataStore";

export default function DraftEmailsPage() {
  const {
    matchDrafts, participants, participantEmails,
    generateEmailDrafts, updateParticipantEmail, sendApprovedDrafts,
  } = useStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [sent, setSent] = useState(false);
  const [deliveryPage, setDeliveryPage] = useState(0);
  const DELIVERY_PAGE_SIZE = 30;

  // Build per-participant view from approved pairs
  const participantQueue = useMemo(() => {
    const map: Record<string, { participant: typeof participants[0]; partners: typeof participants[0][]; pairCount: number }> = {};
    for (const draft of matchDrafts) {
      if (draft.status !== "Approved" && draft.status !== "Sent") continue;
      const pA = draft.participantAId
        ? participants.find((p) => p.id === draft.participantAId)
        : participants.find((p) => p.name === draft.pair.split(" + ")[0]);
      const pB = draft.participantBId
        ? participants.find((p) => p.id === draft.participantBId)
        : participants.find((p) => p.name === draft.pair.split(" + ")[1]);
      if (!pA || !pB) continue;
      if (!map[pA.id]) map[pA.id] = { participant: pA, partners: [], pairCount: 0 };
      if (!map[pB.id]) map[pB.id] = { participant: pB, partners: [], pairCount: 0 };
      map[pA.id].partners.push(pB);
      map[pA.id].pairCount++;
      map[pB.id].partners.push(pA);
      map[pB.id].pairCount++;
    }
    return Object.values(map).sort((a, b) => a.participant.name.localeCompare(b.participant.name));
  }, [matchDrafts, participants]);

  // Auto-select first participant when list becomes non-empty
  useEffect(() => {
    if (!selectedId && participantQueue.length > 0) {
      setSelectedId(participantQueue[0].participant.id);
    }
  }, [participantQueue, selectedId]);

  const selectedEntry = participantQueue.find((e) => e.participant.id === selectedId);
  const selectedEmail = selectedId ? participantEmails[selectedId] : undefined;

  // Local edits before save
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (selectedEmail) {
      setEditSubject(selectedEmail.subject);
      setEditBody(selectedEmail.body);
      setDirty(false);
    } else if (selectedEntry) {
      setEditSubject("");
      setEditBody("");
      setDirty(false);
    }
  }, [selectedId, selectedEmail]); // reset editor when selection changes

  function handleSave() {
    if (!selectedId) return;
    updateParticipantEmail(selectedId, editSubject, editBody);
    setDirty(false);
  }

  const readyCount = Object.values(participantEmails).filter((e) => e.status === "draft").length;
  const sentCount = Object.values(participantEmails).filter((e) => e.status === "sent").length;
  const approvedPairs = matchDrafts.filter((d) => d.status === "Approved").length;
  const blockedCount = matchDrafts.filter((d) => d.email === "Blocked").length;

  function emailStatusPill(id: string) {
    const e = participantEmails[id];
    if (!e) return <span className="status-pill muted">Not generated</span>;
    if (e.status === "sent") return <span className="status-pill sent">Sent</span>;
    return <span className="status-pill">Draft ready</span>;
  }

  const deliveryStart = deliveryPage * DELIVERY_PAGE_SIZE;
  const deliverySlice = participants.slice(deliveryStart, deliveryStart + DELIVERY_PAGE_SIZE);
  const totalDeliveryPages = Math.ceil(participants.length / DELIVERY_PAGE_SIZE);

  return (
    <AppShell active="/drafts">
      <header className="page-header">
        <div>
          <p className="eyebrow">Email delivery</p>
          <h1>Draft Date Emails</h1>
          <p className="page-subtitle">
            Each participant receives one email listing all of their approved dates.
          </p>
        </div>
        <div className="toolbar">
          <button onClick={() => { setGenerated(false); setShowGenerate(true); }} type="button">
            <Mail size={18} />Generate Drafts
          </button>
          <button className="primary" onClick={() => { setSent(false); setShowSend(true); }} type="button">
            <Send size={18} />Send All{readyCount > 0 ? ` (${readyCount})` : ""}
          </button>
        </div>
      </header>

      {showGenerate && (
        <Modal eyebrow="Email drafts" title="Generate Email Drafts" onClose={() => setShowGenerate(false)}>
          {generated ? (
            <>
              <p style={{ marginTop: 14 }}>
                <CheckCircle2 size={16} style={{ color: "var(--green)", verticalAlign: "middle", marginRight: 6 }} />
                One email generated per participant. Select a person below to preview and edit.
              </p>
              <div className="confirm-actions">
                <button className="primary" onClick={() => setShowGenerate(false)} type="button">Done</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginTop: 14 }}>
                {participantQueue.length} participant{participantQueue.length !== 1 ? "s" : ""} with approved matches.
                Each will receive one email listing all their dates.
              </p>
              <div className="confirm-actions">
                <button onClick={() => setShowGenerate(false)} type="button">Cancel</button>
                <button className="primary" onClick={() => { generateEmailDrafts(); setGenerated(true); }} type="button">
                  <Mail size={16} />Generate
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {showSend && (
        <Modal eyebrow="Batch send" title="Send All Draft Emails" onClose={() => setShowSend(false)}>
          {sent ? (
            <>
              <p style={{ marginTop: 14 }}>
                <CheckCircle2 size={16} style={{ color: "var(--green)", verticalAlign: "middle", marginRight: 6 }} />
                Sent.
              </p>
              <div className="confirm-actions">
                <button className="primary" onClick={() => setShowSend(false)} type="button">Done</button>
              </div>
            </>
          ) : readyCount === 0 ? (
            <>
              <p style={{ marginTop: 14 }}>No draft emails ready. Generate drafts first.</p>
            </>
          ) : (
            <>
              <p style={{ marginTop: 14 }}>{readyCount} participant email{readyCount !== 1 ? "s" : ""} will be sent.</p>
              <div className="draft-approval-list">
                {participantQueue.filter((e) => participantEmails[e.participant.id]?.status === "draft").map((e) => (
                  <div className="draft-approval-item" key={e.participant.id} style={{ cursor: "default" }}>
                    <CheckCircle2 size={18} style={{ color: "var(--green)", flexShrink: 0 }} />
                    <label style={{ cursor: "default" }}>
                      {e.participant.name}
                      <small style={{ display: "block" }}>{e.pairCount} date{e.pairCount !== 1 ? "s" : ""}: {e.partners.map(p => p.name).join(", ")}</small>
                    </label>
                  </div>
                ))}
              </div>
              <div className="confirm-actions">
                <button onClick={() => setShowSend(false)} type="button">Cancel</button>
                <button className="primary" onClick={() => { sendApprovedDrafts(); setSent(true); }} type="button">
                  <Send size={16} />Confirm Send
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      <section className="status-strip">
        <div className="status-card"><span>Approved pairs</span><strong>{approvedPairs}</strong></div>
        <div className="status-card important"><span>Blocked</span><strong>{blockedCount}</strong></div>
        <div className="status-card"><span>Emails ready</span><strong>{readyCount}</strong><small>draft generated</small></div>
        <div className="status-card"><span>Sent</span><strong>{sentCount}</strong></div>
      </section>

      <section className="content-grid">
        {/* Participant email queue */}
        <div className="panel">
          <div className="section-head">
            <div><p className="eyebrow">Email queue</p><h2>Participants · {participantQueue.length}</h2></div>
            <ShieldCheck size={20} />
          </div>
          <div className="data-table">
            <div className="data-row data-head" style={{ gridTemplateColumns: "1.5fr 0.8fr 0.9fr" }}>
              <span>Participant</span><span>Dates</span><span>Email</span>
            </div>
            {participantQueue.length === 0 && (
              <div className="data-row" style={{ gridTemplateColumns: "1fr" }}>
                <span style={{ color: "var(--muted)" }}>No approved matches yet. Approve pairs on the Matching page.</span>
              </div>
            )}
            {participantQueue.map(({ participant, partners, pairCount }) => (
              <div
                className={`data-row clickable${participant.id === selectedId ? " selected-row" : ""}`}
                key={participant.id}
                onClick={() => setSelectedId(participant.id)}
                style={{ gridTemplateColumns: "1.5fr 0.8fr 0.9fr" }}
              >
                <span>
                  <strong>{participant.name}</strong>
                  <small>{participant.gender} · {participant.location}</small>
                </span>
                <span style={{ fontSize: 13 }}>
                  {pairCount} date{pairCount !== 1 ? "s" : ""}
                  <small>{partners.map(p => p.name).join(", ")}</small>
                </span>
                <span>{emailStatusPill(participant.id)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Email editor */}
        <aside className="panel">
          <div className="section-head">
            <div><p className="eyebrow">Editor</p><h2>{selectedEntry ? selectedEntry.participant.name : "No selection"}</h2></div>
            {selectedEmail && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!dirty && <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>Saved</span>}
                <button className="primary" disabled={!dirty} onClick={handleSave} type="button"><Save size={15} />Save</button>
              </div>
            )}
          </div>

          {selectedEmail ? (
            <div className="email-editor">
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: 4 }}>Subject</label>
                <input
                  value={editSubject}
                  onChange={(e) => { setEditSubject(e.target.value); setDirty(true); }}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)", display: "block", marginBottom: 4 }}>Body</label>
                <textarea
                  rows={16}
                  value={editBody}
                  onChange={(e) => { setEditBody(e.target.value); setDirty(true); }}
                  style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }}
                />
              </div>
            </div>
          ) : selectedEntry ? (
            <div className="email-preview">
              <strong>No draft yet for {selectedEntry.participant.name}</strong>
              <p style={{ marginTop: 6 }}>Click <strong>Generate Drafts</strong> in the toolbar to build emails for all participants with approved matches. Approved pairs: {matchDrafts.filter(d => d.status === "Approved").length}.</p>
            </div>
          ) : (
            <div className="email-preview">
              <strong>No approved matches yet</strong>
              <p style={{ marginTop: 6 }}>Approve pairs in Match Workbench, then click Generate Drafts here.</p>
            </div>
          )}
        </aside>

        {/* Delivery sheet */}
        <div className="panel span-2">
          <div className="section-head">
            <div><p className="eyebrow">Per-person</p><h2>Delivery Sheet · {participants.length}</h2></div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button disabled={deliveryPage === 0} onClick={() => setDeliveryPage((p) => p - 1)} style={{ minHeight: 30, padding: "4px 10px", fontSize: 13 }} type="button">← Prev</button>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{deliveryPage + 1} / {totalDeliveryPages}</span>
              <button disabled={deliveryPage >= totalDeliveryPages - 1} onClick={() => setDeliveryPage((p) => p + 1)} style={{ minHeight: 30, padding: "4px 10px", fontSize: 13 }} type="button">Next →</button>
              <UsersRound size={20} />
            </div>
          </div>
          <div className="mapping-cards">
            {deliverySlice.map((participant) => {
              const entry = participantQueue.find((e) => e.participant.id === participant.id);
              const email = participantEmails[participant.id];
              return (
                <span key={participant.id}>
                  <strong>{participant.name}</strong>
                  {entry
                    ? entry.partners.map((p) => <span key={p.id} style={{ fontSize: 13 }}>{p.name}</span>)
                    : <span style={{ fontSize: 13, color: "var(--muted)" }}>No approved matches</span>
                  }
                  {email?.status === "sent"
                    ? <small><CheckCircle2 size={14} /> Sent</small>
                    : email?.status === "draft"
                    ? <small><Mail size={14} /> Draft ready</small>
                    : participant.status === "Fee pending"
                    ? <small><Clock size={14} /> Fee pending</small>
                    : <small style={{ color: "var(--muted)" }}>—</small>
                  }
                </span>
              );
            })}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
