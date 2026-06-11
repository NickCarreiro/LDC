"use client";

import { Sparkles } from "lucide-react";

import { useStore } from "../../lib/dataStore";

export function DraftMatchesWidget() {
  const { matchDrafts } = useStore();

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">Curation sheet</p>
          <h2>Draft Matches</h2>
        </div>
        <Sparkles size={20} />
      </div>
      <div className="draft-list">
        {matchDrafts.slice(0, 5).map((d) => (
          <div
            className={d.status === "Needs review" ? "draft-item warning" : "draft-item"}
            key={d.pair}
          >
            <span>{d.pair}</span>
            <strong>
              {d.status === "Approved"
                ? d.score
                : d.status === "Sent"
                ? "Sent"
                : d.status}
            </strong>
          </div>
        ))}
        {matchDrafts.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>No drafts yet.</p>
        )}
      </div>
    </>
  );
}
