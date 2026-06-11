"use client";

import { MapPin, UsersRound } from "lucide-react";
import Link from "next/link";

import { useStore } from "../../lib/dataStore";

export function ParticipantsTableWidget() {
  const { participants } = useStore();

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">Participant review</p>
          <h2>Registered Participants</h2>
        </div>
        <Link className="button-link" href="/participants">
          <UsersRound size={18} />
          Manage
        </Link>
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
              <small>
                {participant.gender}, {participant.age} · wants {participant.desiredDates} dates
              </small>
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
    </>
  );
}
