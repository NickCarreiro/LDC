"use client";

import { CheckCircle2, Download, FileText, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ActionButton } from "../components/ActionButton";
import { AppShell } from "../components/AppShell";
import { Modal } from "../components/Modal";
import { WidgetGrid } from "../components/dashboard/WidgetGrid";
import { useStore } from "../lib/dataStore";

export default function OperationsDashboard() {
  const { participants, sessions, matchDrafts, updateDraftStatus } = useStore();
  const [approveOpen, setApproveOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [approved, setApproved] = useState(false);

  const currentSession = sessions[0];
  const pendingDrafts = matchDrafts.filter(
    (d) => d.status === "Draft" || d.status === "Needs review",
  );

  const dashboardCsv = [
    "name,status,desired_dates,fee",
    ...participants.map((p) => `${p.name},${p.status},${p.desiredDates},${p.fee}`),
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
            results={participants.map(
              (p) => `${p.name} — ${p.status}, wants ${p.desiredDates} dates`,
            )}
          >
            <Search size={18} />
            Search
          </ActionButton>
          <Link className="button-link" href="/forms/summer-2026">
            <FileText size={18} />
            Organizer Form View
          </Link>
          <ActionButton
            action="Dashboard CSV export"
            csvData={dashboardCsv}
            filename="ldc-dashboard-export.csv"
            kind="download"
          >
            <Download size={18} />
            Export Participants CSV
          </ActionButton>
          <button className="primary" onClick={openApprove} type="button">
            <CheckCircle2 size={18} />
            Approve Drafts
            {pendingDrafts.length > 0 ? ` (${pendingDrafts.length})` : ""}
          </button>
        </div>
      </header>

      {approveOpen && (
        <Modal eyebrow="Curation sheet" title="Approve Draft Matches" onClose={() => setApproveOpen(false)}>
          {approved ? (
            <>
              <p>Approved. Go to Draft Emails to generate and send.</p>
              <div className="confirm-actions">
                <Link className="button-link primary" href="/drafts">
                  Go to Draft Emails
                </Link>
              </div>
            </>
          ) : pendingDrafts.length === 0 ? (
            <p style={{ marginTop: 14 }}>
              No pairs are in Draft or Needs-review status. Use Match Workbench to create
              pairs, then return here to approve them.
            </p>
          ) : (
            <>
              <div className="draft-approval-list">
                {pendingDrafts.map((d) => (
                  <div className="draft-approval-item" key={d.pair}>
                    <input
                      id={`approve-${d.pair}`}
                      type="checkbox"
                      checked={!!checked[d.pair]}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [d.pair]: e.target.checked }))
                      }
                    />
                    <label htmlFor={`approve-${d.pair}`}>
                      {d.pair}
                      <small style={{ display: "block", marginTop: 2 }}>
                        Score {d.score} · {d.warnings.join(", ")}
                      </small>
                    </label>
                    <small>{d.status}</small>
                  </div>
                ))}
              </div>
              <div className="confirm-actions">
                <button onClick={() => setApproveOpen(false)} type="button">
                  Cancel
                </button>
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
            </>
          )}
        </Modal>
      )}

      <WidgetGrid />
    </AppShell>
  );
}
