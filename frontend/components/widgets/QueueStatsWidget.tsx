"use client";

import { AlertTriangle, ClipboardCheck, Mail, Sparkles } from "lucide-react";

import { useStore } from "../../lib/dataStore";

export function QueueStatsWidget() {
  const { participants, matchDrafts } = useStore();
  const needsReview = participants.filter((p) => p.special);
  const draftMatches = matchDrafts.filter((d) => d.status === "Draft" || d.status === "Needs review");
  const emailsReady = matchDrafts.filter((d) => d.email === "Ready" && d.status === "Approved");

  return (
    <section className="queue-grid" style={{ marginTop: 0 }}>
      <article className="queue-card">
        <ClipboardCheck size={20} />
        <span>Total participants</span>
        <strong>{participants.length}</strong>
        <small>{participants.filter((p) => p.status === "Accepted").length} accepted</small>
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
        <small>{matchDrafts.filter((d) => d.status === "Approved").length} approved</small>
      </article>
      <article className="queue-card">
        <Mail size={20} />
        <span>Emails ready</span>
        <strong>{emailsReady.length}</strong>
        <small>approved, generated, unsent</small>
      </article>
    </section>
  );
}
