"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import {
  auditEvents as seedAuditEvents,
  matchDrafts as seedMatchDrafts,
  participants as seedParticipants,
  sessions as seedSessions,
  type AuditEvent,
  type MatchDraft,
  type Participant,
  type Session,
  type SessionDisplayName,
} from "./operationsData";
import { DEFAULT_KEYWORDS, type KeywordWeight } from "./visionWeights";

// ── Local helpers ─────────────────────────────────────────────────────────────

const SCHEMA_VERSION = "v7"; // bump when seed data shape changes to force a reset

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    // If schema version doesn't match, clear all stored data and use seed
    const storedVersion = localStorage.getItem("ldc_schema");
    if (storedVersion !== SCHEMA_VERSION) {
      ["ldc_participants","ldc_sessions","ldc_matchDrafts","ldc_auditEvents","ldc_keywords","ldc_participantEmails","ldc_smtp","ldc_sessionDisplayNames"].forEach((k) => localStorage.removeItem(k));
      localStorage.setItem("ldc_schema", SCHEMA_VERSION);
      return fallback;
    }
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AddParticipantFields = {
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  location: string;
  email: string;
  phone: string;
  interests: string;
  ageRange: string;
  desiredDates: number;
  vision: string;
};

type AddSessionFields = {
  id: string;       // caller pre-generates so it can track the new session immediately
  name: string;
  window: string;
  deadline: string;
  men: number;
  women: number;
  notes: string;
};

type Store = {
  participants: Participant[];
  sessions: Session[];
  matchDrafts: MatchDraft[];
  auditEvents: AuditEvent[];
  keywords: KeywordWeight[];
  addKeyword: (kw: Omit<KeywordWeight, "id">) => void;
  updateKeyword: (id: string, updates: Partial<KeywordWeight>) => void;
  removeKeyword: (id: string) => void;
  addParticipant: (fields: AddParticipantFields) => void;
  addSession: (fields: AddSessionFields) => void;
  updateSession: (name: string, updates: Partial<Session>) => void;
  updateParticipant: (id: string, updates: Partial<Participant>) => void;
  addMatchDraft: (draft: MatchDraft) => void;
  removeDraft: (pair: string) => void;
  updateDraftStatus: (pair: string, status: string, email?: string) => void;
  updateDraftEmail: (pair: string, subject: string, body: string) => void;
  participantEmails: Record<string, { subject: string; body: string; status: "draft" | "sent" }>;
  generateEmailDrafts: () => void;
  updateParticipantEmail: (participantId: string, subject: string, body: string) => void;
  sendApprovedDrafts: () => void;
  addAuditEvent: (e: AuditEvent) => void;
  sessionDisplayNames: Record<string, SessionDisplayName[]>;
  generateSessionDisplayNames: (sessionId: string) => void;
  getDisplayName: (participantId: string, sessionId: string) => string;
};

const StoreCtx = createContext<Store | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage if available, fall back to seed data
  const [participants, setParticipants] = useState<Participant[]>(() =>
    load("ldc_participants", seedParticipants)
  );
  const [sessions, setSessions] = useState<Session[]>(() =>
    load("ldc_sessions", seedSessions)
  );
  const [matchDrafts, setMatchDrafts] = useState<MatchDraft[]>(() =>
    load("ldc_matchDrafts", seedMatchDrafts)
  );
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() =>
    load("ldc_auditEvents", seedAuditEvents)
  );
  const [keywords, setKeywords] = useState<KeywordWeight[]>(() =>
    load("ldc_keywords", DEFAULT_KEYWORDS)
  );
  const [participantEmails, setParticipantEmails] = useState<Record<string, { subject: string; body: string; status: "draft" | "sent" }>>(() =>
    load("ldc_participantEmails", {})
  );
  const [sessionDisplayNames, setSessionDisplayNames] = useState<Record<string, SessionDisplayName[]>>(() =>
    load("ldc_sessionDisplayNames", {})
  );

  // Persist to localStorage whenever state changes (skip the very first mount)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    save("ldc_participants", participants);
  }, [participants]);
  useEffect(() => { if (mounted.current) save("ldc_sessions", sessions); }, [sessions]);
  useEffect(() => { if (mounted.current) save("ldc_matchDrafts", matchDrafts); }, [matchDrafts]);
  useEffect(() => { if (mounted.current) save("ldc_auditEvents", auditEvents); }, [auditEvents]);
  useEffect(() => { if (mounted.current) save("ldc_keywords", keywords); }, [keywords]);
  useEffect(() => { if (mounted.current) save("ldc_participantEmails", participantEmails); }, [participantEmails]);
  useEffect(() => { if (mounted.current) save("ldc_sessionDisplayNames", sessionDisplayNames); }, [sessionDisplayNames]);

  // ── Logging ──────────────────────────────────────────────────────────────────
  const logEvent = useCallback((action: string, object: string, sensitivity: string) => {
    const now = new Date();
    const timeStr = `Today ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    setAuditEvents((prev) => [{ actor: "local.organizer@example.org", action, object, sensitivity, time: timeStr }, ...prev]);
  }, []);

  // ── Keyword management ───────────────────────────────────────────────────────
  function addKeyword(kw: Omit<KeywordWeight, "id">) {
    setKeywords((prev) => [...prev, { ...kw, id: `k${Date.now()}` }]);
  }
  function updateKeyword(id: string, updates: Partial<KeywordWeight>) {
    setKeywords((prev) => prev.map((k) => (k.id === id ? { ...k, ...updates } : k)));
  }
  function removeKeyword(id: string) {
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  }

  // ── Participants ─────────────────────────────────────────────────────────────
  function addParticipant(fields: AddParticipantFields) {
    const name = `${fields.firstName} ${fields.lastName}`;
    const initials = `${fields.firstName.charAt(0)}${fields.lastName.charAt(0)}`.toUpperCase();
    const interestList = fields.interests.split(",").map((s) => s.trim()).filter(Boolean);
    const newP: Participant = {
      id: `p${Date.now()}`,
      name,
      initials,
      age: fields.age,
      gender: fields.gender,
      location: fields.location,
      phone: fields.phone,
      email: fields.email,
      interests: interestList,
      visionTags: [],
      vision: fields.vision,
      sessions: ["Summer 2026"],
      previousDates: [],
      desiredDates: fields.desiredDates,
      ageRange: fields.ageRange,
      fee: "pending",
      status: "Fee pending",
      special: false,
      cannotDate: [],
      feedback: "",
      predictedMatches: [],
    };
    setParticipants((prev) => [...prev, newP]);
    logEvent("participant.create", name, "Identity");
  }

  function updateParticipant(id: string, updates: Partial<Participant>) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    // Log name not raw ID
    const name = participants.find((p) => p.id === id)?.name ?? id;
    logEvent("participant.update", name, "Profile");
  }

  // ── Sessions ─────────────────────────────────────────────────────────────────
  function addSession(fields: AddSessionFields) {
    const newS: Session = {
      id: fields.id,
      name: fields.name,
      window: fields.window,
      deadline: fields.deadline,
      size: fields.men + fields.women,
      men: fields.men,
      women: fields.women,
      repeatMen: 0,
      repeatWomen: 0,
      status: "Registration open",
      notes: fields.notes || "New session.",
    };
    setSessions((prev) => [newS, ...prev]);
    logEvent("session.create", fields.name, "Low");
  }

  function updateSession(id: string, updates: Partial<Session>) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  // ── Match drafts ─────────────────────────────────────────────────────────────
  function addMatchDraft(draft: MatchDraft) {
    // Resolve participants by ID (preferred) or name fallback
    const pA = draft.participantAId
      ? participants.find((p) => p.id === draft.participantAId)
      : participants.find((p) => p.name === draft.pair.split(" + ")[0]);
    const pB = draft.participantBId
      ? participants.find((p) => p.id === draft.participantBId)
      : participants.find((p) => p.name === draft.pair.split(" + ")[1]);

    // Block same-gender or shared last name (family)
    if (pA && pB) {
      if (pA.gender === pB.gender) return;
      const lnA = pA.name.split(" ").slice(1).join(" ").trim();
      const lnB = pB.name.split(" ").slice(1).join(" ").trim();
      if (lnA && lnA === lnB) return;
    }

    // Enrich draft with IDs if not already provided
    const enriched: MatchDraft = {
      ...draft,
      participantAId: draft.participantAId ?? pA?.id,
      participantBId: draft.participantBId ?? pB?.id,
    };

    setMatchDrafts((prev) => {
      // Prevent true duplicates by pair string
      if (prev.some((d) => d.pair === enriched.pair)) return prev;
      return [...prev, enriched];
    });
    logEvent("match.draft.create", draft.pair, "Matching data");
  }

  function removeDraft(pair: string) {
    setMatchDrafts((prev) => prev.filter((d) => d.pair !== pair));
    logEvent("match.draft.remove", pair, "Matching data");
  }

  function updateDraftStatus(pair: string, status: string, email?: string) {
    setMatchDrafts((prev) =>
      prev.map((d) => (d.pair === pair ? { ...d, status, ...(email !== undefined ? { email } : {}) } : d))
    );
    logEvent("match.draft.update", pair, "Matching data");
  }

  function updateDraftEmail(pair: string, subject: string, body: string) {
    setMatchDrafts((prev) =>
      prev.map((d) => (d.pair === pair ? { ...d, emailSubject: subject, emailBody: body } : d))
    );
  }

  function generateEmailDrafts() {
    // Mark approved pairs as Ready
    setMatchDrafts((prev) =>
      prev.map((d) => (d.status === "Approved" && d.email !== "Blocked" ? { ...d, email: "Ready" } : d))
    );

    // Build one consolidated email per participant from ALL their approved pairs
    const approvedDrafts = matchDrafts.filter((d) => d.status === "Approved" && d.email !== "Blocked");
    const emailMap: Record<string, { subject: string; body: string; status: "draft" | "sent" }> = { ...participantEmails };

    // Collect all matches per participant
    // Partners are shown by session display name only (e.g. "Mary 1") for privacy
    const sessionId = "Summer 2026";
    const matchesForParticipant: Record<string, { id: string; name: string; firstName: string; partners: string[] }> = {};
    for (const draft of approvedDrafts) {
      const pA = draft.participantAId ? participants.find((p) => p.id === draft.participantAId) : participants.find((p) => p.name === draft.pair.split(" + ")[0]);
      const pB = draft.participantBId ? participants.find((p) => p.id === draft.participantBId) : participants.find((p) => p.name === draft.pair.split(" + ")[1]);
      if (!pA || !pB) continue;
      if (!matchesForParticipant[pA.id]) matchesForParticipant[pA.id] = { id: pA.id, name: pA.name, firstName: pA.name.split(" ")[0], partners: [] };
      if (!matchesForParticipant[pB.id]) matchesForParticipant[pB.id] = { id: pB.id, name: pB.name, firstName: pB.name.split(" ")[0], partners: [] };
      matchesForParticipant[pA.id].partners.push(getDisplayName(pB.id, sessionId));
      matchesForParticipant[pB.id].partners.push(getDisplayName(pA.id, sessionId));
    }

    // Generate one email per participant (don't overwrite manually edited ones)
    for (const { id, firstName, partners } of Object.values(matchesForParticipant)) {
      if (emailMap[id]?.status === "sent") continue; // don't regenerate if already sent
      const dateList = partners.map((n, i) => `${i + 1}. ${n}`).join("\n");
      emailMap[id] = {
        subject: "Your curated dates — Summer 2026",
        body: [
          `Hello ${firstName},`,
          "",
          "The organizing team has finalized your date assignments for the Summer 2026 session.",
          "",
          `Your date${partners.length > 1 ? "s" : ""}:`,
          dateList,
          "",
          "Please follow the event instructions from the organizers for each date and reach out with any questions before meeting.",
          "",
          "With care,",
          "The Little Dates Club Organizing Team",
        ].join("\n"),
        status: "draft",
      };
    }
    setParticipantEmails(emailMap);
    logEvent("email_drafts.generate", `${Object.keys(matchesForParticipant).length} participants`, "Contact information");
  }

  function updateParticipantEmail(participantId: string, subject: string, body: string) {
    setParticipantEmails((prev) => ({ ...prev, [participantId]: { ...(prev[participantId] ?? { status: "draft" }), subject, body } }));
  }

  function sendApprovedDrafts() {
    // Mark pair drafts as Sent
    setMatchDrafts((prev) =>
      prev.map((d) => (d.status === "Approved" && d.email === "Ready" ? { ...d, status: "Sent" } : d))
    );
    // Mark all draft participant emails as sent
    setParticipantEmails((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id].status === "draft") next[id] = { ...next[id], status: "sent" };
      }
      return next;
    });
    logEvent("email.send_batch", "Approved matches", "Contact information");
  }

  // ── Session display names ─────────────────────────────────────────────────────
  // Assigns each participant in a session a first-name-only display name.
  // Participants sharing a first name are numbered (Mary 1, Mary 2).
  // Keyed by first name; numbering is stable within a session (ordered by participant id).
  function generateSessionDisplayNames(sessionId: string) {
    const sessionParticipants = participants.filter((p) => p.sessions.includes(sessionId));
    const byFirstName: Record<string, Participant[]> = {};
    for (const p of sessionParticipants) {
      const first = p.name.split(" ")[0];
      byFirstName[first] = [...(byFirstName[first] ?? []), p];
    }
    const names: SessionDisplayName[] = [];
    for (const [first, group] of Object.entries(byFirstName)) {
      const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
      sorted.forEach((p, i) => {
        names.push({
          sessionId,
          participantId: p.id,
          firstName: first,
          displayName: sorted.length === 1 ? first : `${first} ${i + 1}`,
        });
      });
    }
    setSessionDisplayNames((prev) => ({ ...prev, [sessionId]: names }));
    logEvent("session.display_names.generate", sessionId, "Low");
  }

  function getDisplayName(participantId: string, sessionId: string): string {
    const entry = (sessionDisplayNames[sessionId] ?? []).find((n) => n.participantId === participantId);
    if (entry) return entry.displayName;
    const p = participants.find((x) => x.id === participantId);
    return p ? p.name.split(" ")[0] : participantId;
  }

  function addAuditEvent(e: AuditEvent) {
    setAuditEvents((prev) => [e, ...prev]);
  }

  return (
    <StoreCtx.Provider
      value={{
        participants, sessions, matchDrafts, auditEvents,
        keywords, addKeyword, updateKeyword, removeKeyword,
        addParticipant, addSession, updateSession, updateParticipant,
        addMatchDraft, removeDraft, updateDraftStatus, updateDraftEmail,
        participantEmails, generateEmailDrafts, updateParticipantEmail, sendApprovedDrafts, addAuditEvent,
        sessionDisplayNames, generateSessionDisplayNames, getDisplayName,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within DataProvider");
  return ctx;
}
