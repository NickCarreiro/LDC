"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useStore } from "../../lib/dataStore";

export function ApproveDraftsWidget() {
  const { matchDrafts, updateDraftStatus } = useStore();
  const pendingDrafts = matchDrafts.filter(
    (d) => d.status === "Draft" || d.status === "Needs review",
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [approved, setApproved] = useState(false);

  function handleApprove() {
    Object.entries(checked).forEach(([pair, isChecked]) => {
      if (isChecked) updateDraftStatus(pair, "Approved");
    });
    setApproved(true);
    setChecked({});
  }

  if (approved) {
    return (
      <div className="widget-empty-state">
        <CheckCircle2 size={24} style={{ color: "var(--green)" }} />
        <p>Selected pairs approved.</p>
        <Link className="button-link primary" href="/drafts" style={{ marginTop: 8 }}>
          Go to Draft Emails
        </Link>
        <button
          onClick={() => setApproved(false)}
          style={{ marginTop: 6 }}
          type="button"
        >
          Review more
        </button>
      </div>
    );
  }

  if (pendingDrafts.length === 0) {
    return (
      <div className="widget-empty-state">
        <CheckCircle2 size={24} style={{ color: "var(--muted)" }} />
        <p style={{ color: "var(--muted)" }}>No pairs pending approval.</p>
        <Link className="button-link" href="/matching" style={{ marginTop: 8 }}>
          Open Match Workbench
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="draft-approval-list">
        {pendingDrafts.map((d) => (
          <div className="draft-approval-item" key={d.pair}>
            <input
              id={`w-approve-${d.pair}`}
              type="checkbox"
              checked={!!checked[d.pair]}
              onChange={(e) =>
                setChecked((prev) => ({ ...prev, [d.pair]: e.target.checked }))
              }
            />
            <label htmlFor={`w-approve-${d.pair}`}>
              {d.pair}
              <small style={{ display: "block", marginTop: 2 }}>
                Score {d.score} · {d.warnings.join(", ")}
              </small>
            </label>
            <small>{d.status}</small>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button
          className="primary"
          disabled={!Object.values(checked).some(Boolean)}
          onClick={handleApprove}
          type="button"
        >
          <CheckCircle2 size={16} />
          Approve Selected
        </button>
      </div>
    </div>
  );
}
