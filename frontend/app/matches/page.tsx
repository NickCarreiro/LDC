"use client";

import { CheckCircle2, ChevronDown, ChevronRight, HeartHandshake, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "../../components/AppShell";
import { Modal } from "../../components/Modal";
import { useStore } from "../../lib/dataStore";
import { describeConflicts, scoreParticipants } from "../../lib/operationsData";

type SortKey = "score" | "pair" | "status";

function scoreCircleClass(score: number) {
  if (score >= 70) return "score-circle high";
  if (score >= 45) return "score-circle mid";
  return "score-circle low";
}

export default function MatchesPage() {
  const { matchDrafts, participants, removeDraft, updateDraftStatus, bulkApproveDrafts, keywords } = useStore();

  // Draft matches table state
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedPair, setExpandedPair] = useState<string | null>(null);

  // Mass approve state
  const [showApproveAll, setShowApproveAll] = useState(false);
  const [approveAllDone, setApproveAllDone] = useState(false);

  // Date history table state
  const [historySearch, setHistorySearch] = useState("");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(key !== "score"); }
  }

  const filteredDrafts = useMemo(() => {
    let list = [...matchDrafts];
    if (draftStatus !== "All") list = list.filter((d) => d.status === draftStatus);
    if (draftSearch.trim()) {
      const q = draftSearch.toLowerCase();
      list = list.filter((d) => d.pair.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "score") cmp = b.score - a.score;
      else if (sortKey === "pair") cmp = a.pair.localeCompare(b.pair);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      return sortAsc ? -cmp : cmp;
    });
    return list;
  }, [matchDrafts, draftStatus, draftSearch, sortKey, sortAsc]);

  // Pairs visible in the current filtered view that can still be approved
  const approvablePairs = filteredDrafts
    .filter((d) => d.status !== "Approved" && d.status !== "Sent")
    .map((d) => d.pair);

  // Build date history from previousDates across all participants
  const dateHistory = useMemo(() => {
    const rows: { person: string; personGender: string; personLoc: string; date: string; cannotRepeat: boolean; blockedReason: string; matchedParticipant: boolean }[] = [];
    for (const p of participants) {
      if (p.previousDates.length === 0 || p.previousDates.every((d) => d.toLowerCase() === "new to the club")) continue;
      for (const d of p.previousDates) {
        const other = participants.find((x) => x.name === d);
        const pBlocksOther = p.cannotDate.includes(d);
        const otherBlocksP = other?.cannotDate.includes(p.name) ?? false;
        const cannotRepeat = pBlocksOther || otherBlocksP;
        const blockedReason = pBlocksOther && otherBlocksP ? "Both blocked each other"
          : pBlocksOther ? `${p.name} blocked`
          : otherBlocksP ? `${d} blocked`
          : "";
        rows.push({ person: p.name, personGender: p.gender, personLoc: p.location, date: d, cannotRepeat, blockedReason, matchedParticipant: Boolean(other) });
      }
    }
    return rows;
  }, [participants]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return dateHistory;
    const q = historySearch.toLowerCase();
    return dateHistory.filter(
      (r) => r.person.toLowerCase().includes(q) || r.date.toLowerCase().includes(q)
    );
  }, [dateHistory, historySearch]);

  // Look up participant objects — ID first, name as fallback
  function getDetailForPair(draft: typeof matchDrafts[0]) {
    const a = draft.participantAId
      ? participants.find((p) => p.id === draft.participantAId)
      : participants.find((p) => p.name === draft.pair.split(" + ")[0]);
    const b = draft.participantBId
      ? participants.find((p) => p.id === draft.participantBId)
      : participants.find((p) => p.name === draft.pair.split(" + ")[1]);
    if (!a || !b) return null;
    return scoreParticipants(a, b, keywords);
  }

  function pillClass(status: string) {
    if (status === "Approved") return "status-pill";
    if (status === "Sent") return "status-pill sent";
    if (status === "Needs review") return "status-pill warning";
    return "status-pill muted";
  }

  const STATUS_FILTERS = ["All", "Draft", "Approved", "Needs review", "Sent"];

  return (
    <AppShell active="/matches">
      <header className="page-header">
        <div>
          <p className="eyebrow">Match management</p>
          <h1>Matchups and Dating History</h1>
          <p className="page-subtitle">
            Inspect all draft pairs and prior dating history with filters and compatibility breakdowns.
          </p>
        </div>
      </header>

      {/* ── Draft Matches ─────────────────────────────────────────── */}
      {showApproveAll && (
        <Modal eyebrow="Curation sheet" title="Approve All Visible Pairs" onClose={() => { setShowApproveAll(false); setApproveAllDone(false); }}>
          {approveAllDone ? (
            <>
              <p style={{ marginTop: 14 }}>
                <CheckCircle2 size={16} style={{ color: "var(--green)", verticalAlign: "middle", marginRight: 6 }} />
                {approvablePairs.length} pair{approvablePairs.length !== 1 ? "s" : ""} approved.
              </p>
              <div className="confirm-actions">
                <button className="primary" onClick={() => { setShowApproveAll(false); setApproveAllDone(false); }} type="button">Done</button>
              </div>
            </>
          ) : approvablePairs.length === 0 ? (
            <>
              <p style={{ marginTop: 14 }}>All visible pairs are already approved or sent.</p>
              <div className="confirm-actions">
                <button onClick={() => setShowApproveAll(false)} type="button">Close</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginTop: 14 }}>
                Approve <strong>{approvablePairs.length}</strong> pair{approvablePairs.length !== 1 ? "s" : ""}
                {draftSearch.trim() || draftStatus !== "All" ? " matching current filters" : ""}?
                Already-approved and sent pairs are unaffected.
              </p>
              <div className="draft-approval-list" style={{ maxHeight: 240, overflowY: "auto" }}>
                {approvablePairs.map((pair) => (
                  <div className="draft-approval-item" key={pair} style={{ cursor: "default" }}>
                    <CheckCircle2 size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
                    <label style={{ cursor: "default" }}>{pair}</label>
                  </div>
                ))}
              </div>
              <div className="confirm-actions">
                <button onClick={() => setShowApproveAll(false)} type="button">Cancel</button>
                <button className="primary" onClick={() => { bulkApproveDrafts(approvablePairs); setApproveAllDone(true); }} type="button">
                  <CheckCircle2 size={16} />Approve All
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      <section style={{ marginTop: 14 }}>
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Curation sheet</p>
              <h2>Draft Pairs · {filteredDrafts.length} of {matchDrafts.length}</h2>
            </div>
            <button
              className={approvablePairs.length > 0 ? "primary" : undefined}
              disabled={approvablePairs.length === 0}
              onClick={() => { setApproveAllDone(false); setShowApproveAll(true); }}
              type="button"
            >
              <CheckCircle2 size={16} />
              Approve All{approvablePairs.length > 0 ? ` (${approvablePairs.length})` : ""}
            </button>
          </div>

          <div className="filter-bar">
            <input
              placeholder="Search by name…"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />
            <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
              {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <span style={{ color: "var(--muted)", fontSize: 13, marginLeft: "auto" }}>
              Sort:
            </span>
            {(["score", "pair", "status"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                style={{ minHeight: 32, padding: "4px 10px", fontSize: 12, background: sortKey === k ? "var(--ldc-blue)" : undefined, color: sortKey === k ? "#fff" : undefined, borderColor: sortKey === k ? "var(--ldc-blue)" : undefined }}
                type="button"
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}{sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}
              </button>
            ))}
          </div>

          <div className="data-table">
            <div className="data-row data-head" style={{ gridTemplateColumns: "2fr 0.8fr 1.4fr 1.2fr 0.8fr auto" }}>
              <span>Pair — click row to expand</span>
              <span>Score</span>
              <span>Location</span>
              <span>Status</span>
              <span>Email</span>
              <span>Actions</span>
            </div>

            {filteredDrafts.length === 0 && (
              <div className="data-row" style={{ gridTemplateColumns: "1fr" }}>
                <span style={{ color: "var(--muted)" }}>
                  {matchDrafts.length === 0 ? "No match drafts yet. Go to Matching to add pairs." : "No results match filters."}
                </span>
              </div>
            )}

            {filteredDrafts.map((draft) => {
              const isExpanded = expandedPair === draft.pair;
              const detail = isExpanded ? getDetailForPair(draft) : null;
              return (
                <div key={draft.pair}>
                  <div
                    className={`data-row match-row${isExpanded ? " expanded" : ""}`}
                    style={{ gridTemplateColumns: "2fr 0.8fr 1.4fr 1.2fr 0.8fr auto" }}
                    onClick={() => setExpandedPair(isExpanded ? null : draft.pair)}
                  >
                    <span>
                      {isExpanded ? <ChevronDown size={14} style={{ marginRight: 6, verticalAlign: "middle", color: "var(--ldc-blue)" }} /> : <ChevronRight size={14} style={{ marginRight: 6, verticalAlign: "middle", color: "var(--muted)" }} />}
                      <strong>{draft.pair}</strong>
                      <span className={draft.source.toLowerCase().includes("algorithm") ? "status-pill blue" : "status-pill"} style={{ marginTop: 4, display: "inline-flex", fontSize: 11 }}>
                        {draft.source.toLowerCase().includes("algorithm") ? "Algorithm" : "Matchmaker"}
                      </span>
                    </span>
                    <span>
                      <strong style={{ color: draft.score >= 70 ? "var(--green)" : draft.score >= 45 ? "var(--gold)" : "var(--ldc-red)", fontSize: 18 }}>
                        {draft.score}
                      </strong>
                    </span>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>
                      {(() => {
                        const [nameA, nameB] = draft.pair.split(" + ");
                        const a = participants.find((p) => p.name === nameA);
                        const b = participants.find((p) => p.name === nameB);
                        if (!a || !b) return "—";
                        if (a.location === b.location) return a.location;
                        return `${a.location} / ${b.location}`;
                      })()}
                    </span>
                    <span><span className={pillClass(draft.status)}>{draft.status}</span></span>
                    <span><span className={draft.email === "Ready" ? "status-pill" : draft.email === "Blocked" ? "status-pill warning" : "status-pill muted"}>{draft.email}</span></span>
                    <span onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 5 }}>
                      {draft.status !== "Approved" && draft.status !== "Sent" && (
                        <button onClick={() => updateDraftStatus(draft.pair, "Approved")} style={{ fontSize: 12, minHeight: 28, padding: "3px 8px" }} type="button">Approve</button>
                      )}
                      {draft.status === "Approved" && (
                        <button onClick={() => updateDraftStatus(draft.pair, "Draft")} style={{ fontSize: 12, minHeight: 28, padding: "3px 8px" }} type="button">Hold</button>
                      )}
                      {draft.status !== "Sent" && (
                        <button onClick={() => removeDraft(draft.pair)} style={{ fontSize: 12, minHeight: 28, padding: "3px 8px", borderColor: "#f0d0d0", color: "var(--ldc-red)" }} type="button"><X size={11} /></button>
                      )}
                    </span>
                  </div>

                  {isExpanded && detail && (
                    <div className="match-detail">
                      <div className="match-detail-person">
                        <h4>{detail.a.name}</h4>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>{detail.a.location} · {detail.a.age} · desires {detail.a.desiredDates} dates</div>
                        <div className="shared-tags">
                          {detail.a.interests.map((i) => (
                            <span key={i} className={detail.sharedInterests.includes(i) ? "shared-tag" : "tag-wrap"} style={detail.sharedInterests.includes(i) ? {} : { background: "#f0f0f0", color: "var(--muted)", borderRadius: "999px", padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                              {i}
                            </span>
                          ))}
                        </div>
                        <div className="shared-tags" style={{ marginTop: 6 }}>
                          {detail.a.visionTags.map((t) => (
                            <span key={t} className={detail.sharedVision.includes(t) ? "shared-tag" : ""} style={!detail.sharedVision.includes(t) ? { background: "#f0f0f0", color: "var(--muted)", borderRadius: "999px", padding: "3px 8px", fontSize: 11, fontWeight: 700 } : {}}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="match-detail-center">
                        <div className={scoreCircleClass(detail.score)}>{detail.score}</div>
                        {(detail.sharedInterests.length > 0 || detail.visionSharedThemes.length > 0) && (
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>IN COMMON</div>
                            <div className="shared-tags" style={{ justifyContent: "center" }}>
                              {detail.sharedInterests.map((i) => <span key={i} className="shared-tag">{i}</span>)}
                              {detail.visionSharedThemes.map((t) => <span key={t} className="shared-tag">{t.replace(/_/g, " ")}</span>)}
                            </div>
                            {detail.visionBonus > 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>+{detail.visionBonus} pts from vision keywords</div>}
                          </div>
                        )}
                        {describeConflicts(detail.a, detail.b).map((c) => (
                          <div key={c.label} style={{ textAlign: "center" }}>
                            <span className="conflict-tag" style={{ background: c.severity === "block" ? "#fff1f1" : "#fff8e1", color: c.severity === "block" ? "var(--ldc-red)" : "var(--warning)" }}>
                              {c.label}
                            </span>
                            <p style={{ fontSize: 11, color: c.severity === "block" ? "var(--ldc-red)" : "var(--warning)", margin: "4px 0 0", lineHeight: 1.3 }}>
                              {c.detail}
                            </p>
                          </div>
                        ))}
                        {draft.warnings.map((w) => <span key={w} style={{ fontSize: 11, color: "var(--warning)", fontWeight: 700 }}>{w}</span>)}
                      </div>

                      <div className="match-detail-person">
                        <h4>{detail.b.name}</h4>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>{detail.b.location} · {detail.b.age} · desires {detail.b.desiredDates} dates</div>
                        <div className="shared-tags">
                          {detail.b.interests.map((i) => (
                            <span key={i} className={detail.sharedInterests.includes(i) ? "shared-tag" : ""} style={!detail.sharedInterests.includes(i) ? { background: "#f0f0f0", color: "var(--muted)", borderRadius: "999px", padding: "3px 8px", fontSize: 11, fontWeight: 700 } : {}}>
                              {i}
                            </span>
                          ))}
                        </div>
                        <div className="shared-tags" style={{ marginTop: 6 }}>
                          {detail.b.visionTags.map((t) => (
                            <span key={t} className={detail.sharedVision.includes(t) ? "shared-tag" : ""} style={!detail.sharedVision.includes(t) ? { background: "#f0f0f0", color: "var(--muted)", borderRadius: "999px", padding: "3px 8px", fontSize: 11, fontWeight: 700 } : {}}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Date History ───────────────────────────────────────────── */}
      <section style={{ marginTop: 14 }}>
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Prior sessions</p>
              <h2>Date History · {filteredHistory.length} records</h2>
            </div>
            <HeartHandshake size={20} />
          </div>

          <div className="filter-bar">
            <input
              placeholder="Search by name…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              {dateHistory.length === 0 ? "No prior dates recorded in current dataset." : `${dateHistory.length} total prior date records`}
            </span>
          </div>

          <div className="data-table history-table">
            <div className="data-row data-head" style={{ gridTemplateColumns: "1.2fr 1.2fr 1fr 0.8fr" }}>
              <span>Participant</span>
              <span>Prior date</span>
              <span>Location</span>
              <span>Flag</span>
            </div>
            {filteredHistory.length === 0 && (
              <div className="data-row" style={{ gridTemplateColumns: "1fr" }}>
                <span style={{ color: "var(--muted)" }}>No prior date history found.</span>
              </div>
            )}
            {filteredHistory.slice(0, 200).map((row, i) => (
              <div className="data-row" key={`${row.person}-${row.date}-${i}`} style={{ gridTemplateColumns: "1.2fr 1.2fr 1fr 0.8fr" }}>
                <span>
                  <strong>{row.person}</strong>
                  <small>{row.personGender}</small>
                </span>
                <span>{row.date}</span>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>{row.personLoc}</span>
                <span>
                  {row.cannotRepeat
                    ? <span className="status-pill warning" title={row.blockedReason}>Blocked — {row.blockedReason}</span>
                    : !row.matchedParticipant
                    ? <span className="status-pill warning" title="Imported history did not exactly match a current participant name">Review manually</span>
                    : <span className="status-pill">Eligible to repeat</span>
                  }
                </span>
              </div>
            ))}
            {filteredHistory.length > 200 && (
              <div className="data-row" style={{ gridTemplateColumns: "1fr" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Showing 200 of {filteredHistory.length}. Use search to narrow.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
