"use client";

import { useStore } from "../../lib/dataStore";
import { participantGenderRole } from "../../lib/operationsData";

export function StatusStatsWidget() {
  const { participants, matchDrafts } = useStore();
  const women = participants.filter((p) => participantGenderRole(p.gender) === "woman");
  const men = participants.filter((p) => participantGenderRole(p.gender) === "man");
  const feePending = participants.filter((p) => p.fee === "pending" || p.status === "Fee pending");
  const draftMatches = matchDrafts.filter((d) => d.status === "Draft" || d.status === "Needs review");
  const emailsReady = matchDrafts.filter((d) => d.email === "Ready" && d.status === "Approved");

  return (
    <div className="status-strip" style={{ marginTop: 0 }}>
      <div className="status-card important">
        <span>Men registered</span>
        <strong>{men.length}</strong>
        <small>{men.filter((p) => p.status === "Accepted").length} accepted</small>
      </div>
      <div className="status-card">
        <span>Women registered</span>
        <strong>{women.length}</strong>
        <small>{women.filter((p) => p.status === "Accepted").length} accepted</small>
      </div>
      <div className="status-card important">
        <span>Fee pending</span>
        <strong>{feePending.length}</strong>
        <small>{feePending.length === 0 ? "all clear" : "need payment confirmation"}</small>
      </div>
      <div className="status-card">
        <span>Pending approval</span>
        <strong>{draftMatches.length}</strong>
        <small>
          {matchDrafts.filter((d) => d.status === "Approved").length} approved ·{" "}
          {emailsReady.length} email{emailsReady.length !== 1 ? "s" : ""} ready
        </small>
      </div>
    </div>
  );
}
