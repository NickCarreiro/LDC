"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, HeartHandshake, LockKeyhole, Plus, Settings, Sparkles, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "../../components/AppShell";
import { Modal } from "../../components/Modal";
import { useStore } from "../../lib/dataStore";
import { describeConflicts, participantGenderRole, scoreParticipants, type MatchDraft } from "../../lib/operationsData";
import { ALL_THEMES, THEME_LABELS, extractThemeProfile } from "../../lib/visionWeights";

export default function MatchingPage() {
  const { participants, matchDrafts, addMatchDraft, removeDraft, updateDraftStatus, keywords, addKeyword, updateKeyword, removeKeyword } = useStore();
  const women = participants.filter((p) => participantGenderRole(p.gender) === "woman");
  const men = participants.filter((p) => participantGenderRole(p.gender) === "man");
  const [primary, setPrimary] = useState(women[0]?.id ?? "");
  const [secondary, setSecondary] = useState(men[0]?.id ?? "");

  // Keyword config state
  const [kwOpen, setKwOpen] = useState(false);
  const [kwForm, setKwForm] = useState({ pattern: "", theme: "faith_practice" as typeof ALL_THEMES[number], weight: "1.0" });
  const [previewText, setPreviewText] = useState("");
  const previewProfile = useMemo(() => extractThemeProfile(previewText, keywords), [previewText, keywords]);

  const [showAddMatch, setShowAddMatch] = useState(false);
  const [matchForm, setMatchForm] = useState({ personA: "", personB: "", source: "manual", notes: "" });
  const [matchAdded, setMatchAdded] = useState(false);

  const [showReco, setShowReco] = useState(false);
  const [recoAdded, setRecoAdded] = useState<string[]>([]);

  const participantA = participants.find((p) => p.id === primary);
  const participantB = participants.find((p) => p.id === secondary);
  const result = useMemo(() => {
    if (!participantA || !participantB) return null;
    return scoreParticipants(participantA, participantB, keywords);
  }, [participantA, participantB, keywords]);

  const matchA = participants.find((p) => p.id === matchForm.personA);
  const matchB = participants.find((p) => p.id === matchForm.personB);
  const matchPreview = useMemo(() => {
    if (!matchA || !matchB) return null;
    return scoreParticipants(matchA, matchB, keywords);
  }, [matchA, matchB, keywords]);

  const existingPairs = new Set(matchDrafts.map((d) => d.pair));

  // Constrained greedy allocation:
  // - Each person gets at most their desiredDates matches
  // - Each woman gets at most one match with a special-flagged man
  // - Blocked pairs (cannot-date) are excluded
  // - Pairs already in matchDrafts count against the capacity
  const recommendations = useMemo(() => {
    type Pair = { score: number; a: typeof participants[0]; b: typeof participants[0]; sharedInterests: string[] };

    // Pre-score all valid pairs
    const scored: Pair[] = [];
    for (const w of women) {
      for (const m of men) {
        const r = scoreParticipants(w, m, keywords);
        if (!r.blocked) scored.push({ score: r.score, a: w, b: m, sharedInterests: r.sharedInterests });
      }
    }
    scored.sort((x, y) => y.score - x.score);

    // Seed capacity counters from existing approved/draft pairs in the curation sheet
    const datesUsed: Record<string, number> = {};
    const specialUsed: Record<string, number> = {};
    for (const d of matchDrafts) {
      if (d.status === "Sent") continue;
      const pA = d.participantAId ? participants.find((p) => p.id === d.participantAId) : undefined;
      const pB = d.participantBId ? participants.find((p) => p.id === d.participantBId) : undefined;
      if (pA) datesUsed[pA.id] = (datesUsed[pA.id] ?? 0) + 1;
      if (pB) datesUsed[pB.id] = (datesUsed[pB.id] ?? 0) + 1;
      if (pB?.special && pA) specialUsed[pA.id] = (specialUsed[pA.id] ?? 0) + 1;
    }

    const allocated: (Pair & { alreadyExists: boolean })[] = [];

    for (const pair of scored) {
      const { a: woman, b: man } = pair;
      const pairStr = `${woman.name} + ${man.name}`;
      const alreadyExists = existingPairs.has(pairStr);

      // Count against capacity even for existing pairs so we don't double-allocate
      if (alreadyExists) {
        allocated.push({ ...pair, alreadyExists: true });
        continue;
      }

      const wUsed = datesUsed[woman.id] ?? 0;
      const mUsed = datesUsed[man.id] ?? 0;
      if (wUsed >= woman.desiredDates) continue;
      if (mUsed >= man.desiredDates) continue;

      // One special-flagged man per woman
      if (man.special && (specialUsed[woman.id] ?? 0) >= 1) continue;

      datesUsed[woman.id] = wUsed + 1;
      datesUsed[man.id] = mUsed + 1;
      if (man.special) specialUsed[woman.id] = (specialUsed[woman.id] ?? 0) + 1;

      allocated.push({ ...pair, alreadyExists: false });
    }

    return { pairs: allocated, datesUsed };
  }, [women, men, keywords, matchDrafts, participants]);

  function openAddMatch() {
    setMatchForm({ personA: women[0]?.id ?? "", personB: men[0]?.id ?? "", source: "manual", notes: "" });
    setMatchAdded(false);
    setShowAddMatch(true);
  }

  function submitMatch() {
    if (!matchA || !matchB) return;
    const pair = `${matchA.name} + ${matchB.name}`;
    if (existingPairs.has(pair)) return;
    const score = matchPreview?.score ?? 0;
    const newDraft: MatchDraft = {
      pair,
      participantAId: matchA.id,
      participantBId: matchB.id,
      score,
      status: "Draft",
      source: matchForm.source === "manual" ? "Manual" : "Algorithm recommendation",
      warnings: [
        ...(matchPreview?.priorDate ? ["Prior date history"] : []),
        ...(matchA.special || matchB.special ? ["Private note — check before assigning"] : []),
        ...(matchB.status === "Fee pending" ? ["Fee pending"] : [])
      ],
      email: "Not generated"
    };
    addMatchDraft(newDraft);
    setMatchAdded(true);
  }

  function addRecommendation(a: typeof participants[0], b: typeof participants[0], score: number) {
    const pair = `${a.name} + ${b.name}`;
    if (existingPairs.has(pair) || recoAdded.includes(pair)) return;
    const draft: MatchDraft = {
      pair,
      participantAId: a.id,
      participantBId: b.id,
      score,
      status: "Draft",
      source: "Algorithm recommendation",
      warnings: [
        ...(b.special ? ["Special flag — only one per woman"] : []),
        ...(b.status === "Fee pending" ? ["Fee pending"] : [])
      ],
      email: "Not generated"
    };
    addMatchDraft(draft);
    setRecoAdded((prev) => [...prev, pair]);
  }

  function addAllRecommendations() {
    recommendations.pairs
      .filter((p) => !p.alreadyExists && !recoAdded.includes(`${p.a.name} + ${p.b.name}`))
      .forEach(({ a, b, score }) => addRecommendation(a, b, score));
  }

  function pillClass(status: string) {
    if (status === "Approved") return "status-pill";
    if (status === "Sent") return "status-pill sent";
    if (status === "Needs review") return "status-pill warning";
    return "status-pill muted";
  }

  return (
    <AppShell active="/matching">
      <header className="page-header">
        <div>
          <p className="eyebrow">Manual curation</p>
          <h1>Matching Workbench</h1>
          <p className="page-subtitle">
            Make human-first matches, then use advisory scoring to surface shared interests, vision tags, prior history, and constraints.
          </p>
        </div>
        <div className="toolbar">
          <button onClick={() => { setRecoAdded([]); setShowReco(true); }} type="button">
            <Sparkles size={18} />Generate Recommendations
          </button>
          <button className="primary" onClick={openAddMatch} type="button">
            <HeartHandshake size={18} />Add Manual Match
          </button>
        </div>
      </header>

      {showAddMatch && (
        <Modal eyebrow="Manual curation" title="Add Manual Match" onClose={() => setShowAddMatch(false)} size="lg">
          {matchAdded ? (
            <>
              <p style={{ marginTop: 14 }}>
                <CheckCircle2 size={16} style={{ color: "var(--green)", verticalAlign: "middle", marginRight: 6 }} />
                {matchA?.name} + {matchB?.name} has been added to the draft curation sheet with status Draft.
              </p>
              <div className="confirm-actions">
                <button className="primary" onClick={() => { setMatchAdded(false); setMatchForm({ personA: women[0]?.id ?? "", personB: men[0]?.id ?? "", source: "manual", notes: "" }); }} type="button">
                  Add Another
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="form-grid">
                <label>
                  Person A (woman)
                  <select value={matchForm.personA} onChange={(e) => setMatchForm((f) => ({ ...f, personA: e.target.value }))}>
                    {women.map((w) => <option value={w.id} key={w.id}>{w.name} — {w.location}</option>)}
                  </select>
                </label>
                <label>
                  Person B (man)
                  <select value={matchForm.personB} onChange={(e) => setMatchForm((f) => ({ ...f, personB: e.target.value }))}>
                    {men.map((m) => <option value={m.id} key={m.id}>{m.name} — {m.location}</option>)}
                  </select>
                </label>
                <label>
                  Match source
                  <select value={matchForm.source} onChange={(e) => setMatchForm((f) => ({ ...f, source: e.target.value }))}>
                    <option value="manual">Manual</option>
                    <option value="algorithm">Algorithm recommendation</option>
                  </select>
                </label>
                <label>
                  Curator notes
                  <input value={matchForm.notes} onChange={(e) => setMatchForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes for review" />
                </label>
              </div>
              {matchPreview && (
                <div className="score-panel" style={{ marginTop: 16 }}>
                  <div>
                    <span>Advisory score <small style={{ fontWeight: 400 }}>(0–100)</small></span>
                    <strong>{matchPreview.score}</strong>
                  </div>
                  <p>Shared interests: {matchPreview.sharedInterests.join(", ") || "none"}</p>
                  <p>Shared vision: {matchPreview.sharedVision.join(", ") || "none"}</p>
                  {matchA && matchB && describeConflicts(matchA, matchB).map((c) => (
                    <p key={c.label} style={{ color: c.severity === "block" ? "var(--ldc-red)" : "var(--warning)", fontWeight: c.severity === "block" ? 700 : 400, marginBottom: 4 }}>
                      {c.label}: {c.detail}
                    </p>
                  ))}
                  {existingPairs.has(`${matchA?.name} + ${matchB?.name}`) && (
                    <p style={{ color: "var(--warning)" }}>This pair already exists in the draft sheet</p>
                  )}
                </div>
              )}
              <div className="confirm-actions">
                <button onClick={() => setShowAddMatch(false)} type="button">Cancel</button>
                <button
                  className="primary"
                  disabled={!matchForm.personA || !matchForm.personB || matchPreview?.blocked || existingPairs.has(`${matchA?.name} + ${matchB?.name}`)}
                  onClick={submitMatch}
                  type="button"
                >
                  <HeartHandshake size={16} />Add to Draft Sheet
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {showReco && (() => {
        // Group pairs by woman so each person sees their full date list
        const byWoman: Record<string, typeof recommendations.pairs> = {};
        for (const pair of recommendations.pairs) {
          const key = pair.a.id;
          if (!byWoman[key]) byWoman[key] = [];
          byWoman[key].push(pair);
        }
        const womenWithDates = Object.entries(byWoman);
        const newCount = recommendations.pairs.filter(p => !p.alreadyExists).length;
        return (
          <Modal eyebrow="Generate Recommendations" title="Date Lists by Participant" onClose={() => setShowReco(false)} size="lg">
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "8px 0 14px", fontSize: 13, color: "var(--muted)" }}>
              <span>{womenWithDates.length} women · {newCount} new pairs to add</span>
              <span>Each person allocated up to their desired date count</span>
              <span>One special-flagged man per woman enforced</span>
            </div>
            <div className="reco-list">
              {womenWithDates.map(([womanId, pairs]) => {
                const woman = pairs[0].a;
                const filled = recommendations.datesUsed[woman.id] ?? 0;
                return (
                  <div key={womanId} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", background: "var(--surface-soft)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <strong style={{ color: "var(--ldc-blue)" }}>{woman.name}</strong>
                      <span style={{ fontSize: 12, color: filled >= woman.desiredDates ? "var(--green)" : "var(--muted)", fontWeight: 700 }}>
                        {filled} / {woman.desiredDates} dates
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {pairs.map(({ b, score, alreadyExists: exists }) => {
                        const pair = `${woman.name} + ${b.name}`;
                        const added = recoAdded.includes(pair);
                        return (
                          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", background: "#fff", borderRadius: 6, border: "1px solid var(--line)" }}>
                            <span style={{ fontSize: 13 }}>
                              {b.name}
                              {b.special && <span className="status-pill warning" style={{ fontSize: 10, marginLeft: 6 }}>Special</span>}
                              <small style={{ color: "var(--muted)", marginLeft: 8 }}>score {score}</small>
                            </span>
                            <button
                              disabled={exists || added}
                              onClick={() => addRecommendation(woman, b, score)}
                              style={{ fontSize: 12, minHeight: 26, padding: "3px 10px" }}
                              type="button"
                            >
                              {exists || added ? "Added" : "Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {womenWithDates.length === 0 && (
                <p style={{ color: "var(--muted)" }}>All participants are at their date limit, or no valid pairs remain.</p>
              )}
            </div>
            <div className="confirm-actions">
              <button className="primary" onClick={addAllRecommendations} type="button">
                Add All {recommendations.pairs.filter(p => !p.alreadyExists && !recoAdded.includes(`${p.a.name} + ${p.b.name}`)).length} New Pairs as Drafts
              </button>
            </div>
          </Modal>
        );
      })()}

      <section className="content-grid">
        <div className="panel match-workbench">
          <div className="section-head">
            <div>
              <p className="eyebrow">Dry run</p>
              <h2>Two-Person Vision Match</h2>
            </div>
            <span className="human-control"><LockKeyhole size={15} />Not automated</span>
          </div>
          <div className="selectors">
            <label>
              Woman
              <select value={primary} onChange={(e) => setPrimary(e.target.value)}>
                {women.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>
              Man
              <select value={secondary} onChange={(e) => setSecondary(e.target.value)}>
                {men.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          {result && (
            <div className="score-panel">
              <div>
                <span>Advisory score</span>
                <strong>{result.score}</strong>
              </div>
              <p>Shared interests: {result.sharedInterests.join(", ") || "none"}</p>
              <p>Shared vision tags: {result.sharedVision.join(", ") || "none"}</p>
              {result.visionBonus > 0 && (
                <p>
                  Vision text match: +{result.visionBonus} pts
                  {result.visionSharedThemes.length > 0 && ` (${result.visionSharedThemes.map((t) => THEME_LABELS[t]).join(", ")})`}
                </p>
              )}
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
              <p className="eyebrow">Rules</p>
              <h2>Curation Guardrails</h2>
            </div>
            <AlertTriangle size={20} />
          </div>
          <div className="check-list">
            <span><CheckCircle2 size={17} />Do not exceed each participant's max dates</span>
            <span><CheckCircle2 size={17} />Check prior date history before assigning</span>
            <span><AlertTriangle size={17} />Do not give one woman more than one special-needs-marked date</span>
            <span><AlertTriangle size={17} />Respect cannot-date constraints before emails are drafted</span>
          </div>
        </div>

        <div className="panel span-2">
          <div className="section-head">
            <div>
              <p className="eyebrow">Curation sheet</p>
              <h2>Draft Matches</h2>
            </div>
            <UsersRound size={20} />
          </div>
          <div className="data-table">
            <div className="data-row data-head">
              <span>Pair</span>
              <span>Score</span>
              <span>Warnings</span>
              <span>Status and actions</span>
            </div>
            {matchDrafts.map((draft) => (
              <div className="data-row" key={draft.pair}>
                <span>
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
                <span className="tag-wrap">{draft.warnings.map((w) => <i key={w}>{w}</i>)}</span>
                <span>
                  <span className={pillClass(draft.status)}>{draft.status}</span>
                  <div className="row-actions">
                    {draft.status !== "Approved" && draft.status !== "Sent" && (
                      <button onClick={() => updateDraftStatus(draft.pair, "Approved")} type="button">Approve</button>
                    )}
                    {draft.status === "Approved" && (
                      <button onClick={() => updateDraftStatus(draft.pair, "Draft")} type="button">Hold</button>
                    )}
                    {draft.status !== "Sent" && (
                      <button onClick={() => removeDraft(draft.pair)} style={{ borderColor: "#f0d0d0", color: "var(--ldc-red)" }} type="button">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </span>
              </div>
            ))}
            {matchDrafts.length === 0 && (
              <div className="data-row">
                <span style={{ color: "var(--muted)", gridColumn: "span 4" }}>No draft matches yet. Use Add Manual Match or Generate Recommendations to create pairs.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Vision Keyword Configuration ─────────────────────────────── */}
      <section style={{ marginTop: 14 }}>
        <div className="panel">
          <div
            className="section-head"
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => setKwOpen((o) => !o)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {kwOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <div>
                <p className="eyebrow">Scoring engine</p>
                <h2>Vision Statement Keywords</h2>
              </div>
            </div>
            <Settings size={20} style={{ color: "var(--muted)" }} />
          </div>

          {kwOpen && (
            <>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
                Keywords are matched case-insensitively against free-text vision statements.
                Each keyword contributes its weight to a theme. Shared themes between two participants add up to 20 bonus points to the advisory score.
              </p>

              {/* Add keyword form */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 100px auto", gap: 10, alignItems: "end", marginBottom: 14, padding: "12px 14px", background: "var(--surface-soft)", borderRadius: 8, border: "1px solid var(--line)" }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
                  Keyword / phrase
                  <input
                    value={kwForm.pattern}
                    onChange={(e) => setKwForm((f) => ({ ...f, pattern: e.target.value }))}
                    placeholder="e.g. parish life"
                    style={{ marginTop: 4 }}
                  />
                </label>
                <label style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
                  Theme
                  <select
                    value={kwForm.theme}
                    onChange={(e) => setKwForm((f) => ({ ...f, theme: e.target.value as typeof ALL_THEMES[number] }))}
                    style={{ marginTop: 4 }}
                  >
                    {ALL_THEMES.map((t) => <option key={t} value={t}>{THEME_LABELS[t]}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
                  Weight
                  <select
                    value={kwForm.weight}
                    onChange={(e) => setKwForm((f) => ({ ...f, weight: e.target.value }))}
                    style={{ marginTop: 4 }}
                  >
                    <option value="0.5">0.5 – light</option>
                    <option value="1.0">1.0 – standard</option>
                    <option value="1.5">1.5 – strong</option>
                    <option value="2.0">2.0 – defining</option>
                  </select>
                </label>
                <div />
                <button
                  className="primary"
                  disabled={!kwForm.pattern.trim()}
                  onClick={() => {
                    addKeyword({ pattern: kwForm.pattern.trim(), theme: kwForm.theme, weight: parseFloat(kwForm.weight) });
                    setKwForm((f) => ({ ...f, pattern: "" }));
                  }}
                  style={{ minHeight: 36 }}
                  type="button"
                >
                  <Plus size={15} />Add
                </button>
              </div>

              {/* Keyword table */}
              <div className="data-table" style={{ marginBottom: 16 }}>
                <div className="data-row data-head" style={{ gridTemplateColumns: "2fr 1.5fr 0.8fr auto" }}>
                  <span>Keyword</span><span>Theme</span><span>Weight</span><span></span>
                </div>
                {keywords.map((kw) => (
                  <div className="data-row" key={kw.id} style={{ gridTemplateColumns: "2fr 1.5fr 0.8fr auto" }}>
                    <span><strong style={{ fontFamily: "monospace", fontSize: 13 }}>{kw.pattern}</strong></span>
                    <span>{THEME_LABELS[kw.theme]}</span>
                    <span>
                      <select
                        value={String(kw.weight)}
                        onChange={(e) => updateKeyword(kw.id, { weight: parseFloat(e.target.value) })}
                        style={{ width: "auto", minHeight: 28, padding: "3px 6px", fontSize: 12 }}
                      >
                        <option value="0.5">0.5</option>
                        <option value="1.0">1.0</option>
                        <option value="1.5">1.5</option>
                        <option value="2.0">2.0</option>
                      </select>
                    </span>
                    <span>
                      <button
                        onClick={() => removeKeyword(kw.id)}
                        style={{ minHeight: 28, padding: "3px 8px", fontSize: 12, borderColor: "#f0d0d0", color: "var(--ldc-red)" }}
                        type="button"
                      ><X size={11} /></button>
                    </span>
                  </div>
                ))}
              </div>

              {/* Live preview */}
              <div style={{ padding: "14px", background: "var(--surface-soft)", borderRadius: 8, border: "1px solid var(--line)" }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>Live preview — paste a vision statement to see which themes are detected</p>
                <textarea
                  rows={3}
                  placeholder="Paste a vision statement here…"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  style={{ width: "100%", fontSize: 13 }}
                />
                {previewText && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {ALL_THEMES.map((t) => {
                      const val = previewProfile[t];
                      if (!val) return null;
                      return (
                        <span key={t} className="shared-tag" style={{ fontSize: 12 }}>
                          {THEME_LABELS[t]} · {val.toFixed(1)}
                        </span>
                      );
                    })}
                    {Object.keys(previewProfile).length === 0 && (
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>No keywords matched.</span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
