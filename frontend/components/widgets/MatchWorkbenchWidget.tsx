"use client";

import { useMemo, useState } from "react";

import { useStore } from "../../lib/dataStore";
import { describeConflicts, participantGenderRole, scoreParticipants } from "../../lib/operationsData";

export function MatchWorkbenchWidget() {
  const { participants, keywords } = useStore();
  const women = participants.filter((p) => participantGenderRole(p.gender) === "woman");
  const men = participants.filter((p) => participantGenderRole(p.gender) === "man");
  const [primary, setPrimary] = useState(women[0]?.id ?? "");
  const [secondary, setSecondary] = useState(men[0]?.id ?? "");

  const participantA = participants.find((p) => p.id === primary);
  const participantB = participants.find((p) => p.id === secondary);

  const result = useMemo(() => {
    if (!participantA || !participantB) return null;
    return scoreParticipants(participantA, participantB, keywords);
  }, [participantA, participantB, keywords]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">Dry run</p>
          <h2>Vision &amp; Interest Match</h2>
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
            <span>
              Advisory score{" "}
              <small style={{ fontWeight: 400 }}>(0 = no match · 100 = ideal)</small>
            </span>
            <strong>{result.score}</strong>
          </div>
          <p>Shared interests: {result.sharedInterests.join(", ") || "none"}</p>
          <p>Shared vision tags: {result.sharedVision.join(", ") || "none"}</p>
          {describeConflicts(result.a, result.b).map((c) => (
            <p
              key={c.label}
              style={{
                color: c.severity === "block" ? "var(--ldc-red)" : "var(--warning)",
                fontWeight: c.severity === "block" ? 700 : 400,
                marginBottom: 4,
              }}
            >
              {c.label}: {c.detail}
            </p>
          ))}
          {!result.priorDate && !result.blocked && <p>No conflicts.</p>}
        </div>
      )}
    </>
  );
}
