export interface Participant {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: string;
  location: string;
  phone: string;
  email: string;
  interests: string[];
  visionTags: string[];
  vision: string;
  sessions: string[];
  previousDates: string[];
  desiredDates: number;
  ageRange: string;
  fee: string;
  status: string;
  special: boolean;
  cannotDate: string[];
  feedback: string;
  predictedMatches: string[];
  orientationDate?: string;
  welcomeEmailSent?: boolean;
}

// Maps a participant's global UUID to their session-scoped display name (e.g. "Mary 1")
export interface SessionDisplayName {
  sessionId: string;
  participantId: string;
  firstName: string;
  displayName: string;
}

export interface Session {
  id: string;       // stable UUID — never changes even if name is edited
  name: string;
  window: string;
  deadline: string;
  size: number;
  men: number;
  women: number;
  repeatMen: number;
  repeatWomen: number;
  status: string;
  notes: string;
}

export interface MatchDraft {
  pair: string;
  participantAId?: string;
  participantBId?: string;
  score: number;
  status: string;
  source: string;
  warnings: string[];
  email: string;
  emailSubject?: string;
  emailBody?: string;
}

export interface AuditEvent {
  actor: string;
  action: string;
  object: string;
  sensitivity: string;
  time: string;
}

import { seedParticipants } from "./seedParticipants";
export const participants: Participant[] = seedParticipants;

export const sessions: Session[] = [
  {
    id: "a3d5e7f9-1b2c-4d3e-8f5a-9b0c1d2e3f4a",
    name: "Summer 2026",
    window: "Jun 3 - Aug 14",
    deadline: "May 22",
    size: 250,
    men: 125,
    women: 125,
    repeatMen: 38,
    repeatWomen: 35,
    status: "Registration open",
    notes: "Registration open. New participants need orientation before Jun 3."
  },
  {
    id: "b4e6f8a0-2c3d-4e5f-9a6b-ac1d2e3f4a5b",
    name: "Spring 2026",
    window: "Mar 5 - May 9",
    deadline: "Feb 22",
    size: 71,
    men: 34,
    women: 37,
    repeatMen: 9,
    repeatWomen: 15,
    status: "Completed",
    notes: "Higher repeat women percentage; review negative feedback before invites."
  },
  {
    id: "c5f7a9b1-3d4e-4f6a-ab7c-bd2e3f4a5b6c",
    name: "Winter 2026",
    window: "Jan 7 - Mar 7",
    deadline: "Dec 20",
    size: 96,
    men: 46,
    women: 50,
    repeatMen: 21,
    repeatWomen: 18,
    status: "Completed",
    notes: "Largest cohort; useful baseline for trend comparisons."
  }
];

export const matchDrafts: MatchDraft[] = [];

export const auditEvents: AuditEvent[] = [
  {
    actor: "local.organizer@example.org",
    action: "participant.view",
    object: "Anna M.",
    sensitivity: "Vision statement",
    time: "Today 12:41 PM"
  },
  {
    actor: "local.organizer@example.org",
    action: "participant.export_csv",
    object: "Summer 2026",
    sensitivity: "Contact information",
    time: "Today 12:38 PM"
  },
  {
    actor: "local.organizer@example.org",
    action: "match.dry_run",
    object: "Anna M. + Michael R.",
    sensitivity: "Compatibility scoring",
    time: "Today 12:33 PM"
  },
  {
    actor: "system",
    action: "registration.statement_signed",
    object: "Summer 2026 intake",
    sensitivity: "Safety/liability acknowledgement",
    time: "Yesterday 8:12 PM"
  }
];

import {
  extractThemeProfile,
  scoreVisionCompatibility,
  sharedThemes,
  type KeywordWeight,
  type ThemeProfile,
} from "./visionWeights";

function lastName(name: string) {
  return name.split(" ").slice(1).join(" ").trim(); // everything after first name
}

export function scoreParticipants(
  a: Participant,
  b: Participant,
  keywords: KeywordWeight[] = [],
) {
  const sharedInterests = a.interests.filter((interest) => b.interests.includes(interest));
  const sharedVision = a.visionTags.filter((tag) => b.visionTags.includes(tag));
  const priorDate = a.previousDates.includes(b.name) || b.previousDates.includes(a.name);
  const sharesLastName = lastName(a.name) !== "" && lastName(a.name) === lastName(b.name);
  const blocked = a.cannotDate.includes(b.name) || b.cannotDate.includes(a.name) || sharesLastName;

  // Vision text analysis (0-20 bonus, zero if no keywords configured)
  let profileA: ThemeProfile = {};
  let profileB: ThemeProfile = {};
  let visionBonus = 0;
  let visionSharedThemes: ReturnType<typeof sharedThemes> = [];
  if (keywords.length > 0) {
    profileA = extractThemeProfile(a.vision, keywords);
    profileB = extractThemeProfile(b.vision, keywords);
    visionBonus = Math.round(scoreVisionCompatibility(profileA, profileB));
    visionSharedThemes = sharedThemes(profileA, profileB);
  }

  const score = Math.max(
    0,
    Math.min(100,
      sharedInterests.length * 9
      + sharedVision.length * 14   // reduced slightly to make room for vision bonus
      + (priorDate ? 0 : 16)
      - (blocked ? 35 : 0)
      + visionBonus
    )
  );

  return {
    a, b, sharedInterests, sharedVision, priorDate, blocked, score,
    visionBonus, visionSharedThemes, profileA, profileB,
  };
}

// ── Conflict description ─────────────────────────────────────────────────────

export type ConflictDescription = {
  label: string;
  detail: string;
  severity: "block" | "warn";
};

export function describeConflicts(a: Participant, b: Participant): ConflictDescription[] {
  const out: ConflictDescription[] = [];

  // Shared last name — always a hard block
  const lnA = lastName(a.name);
  const lnB = lastName(b.name);
  if (lnA && lnA === lnB) {
    out.push({
      label: "Shared surname",
      detail: `${a.name} and ${b.name} share the surname "${lnA}" — likely family.`,
      severity: "block",
    });
    return out; // no need to enumerate other conflicts on top of this
  }

  const aBlocksB = a.cannotDate.includes(b.name);
  const bBlocksA = b.cannotDate.includes(a.name);
  const aDatedB  = a.previousDates.includes(b.name);
  const bDatedA  = b.previousDates.includes(a.name);
  const hasPrior = aDatedB || bDatedA;

  if (aBlocksB || bBlocksA) {
    const aIsSibling = a.feedback?.toLowerCase().includes("sibling");
    const bIsSibling = b.feedback?.toLowerCase().includes("sibling");

    if (aIsSibling || bIsSibling) {
      out.push({
        label: "Sibling relationship",
        detail: `${a.name} and ${b.name} are siblings — do not match under any circumstance.`,
        severity: "block",
      });
    } else if (hasPrior) {
      const who = aBlocksB ? a.name : b.name;
      out.push({
        label: "Prior date — blocked",
        detail: `They have dated before and ${who} has restricted further matching.`,
        severity: "block",
      });
    } else if (aBlocksB && bBlocksA) {
      out.push({
        label: "Mutual restriction",
        detail: `Both ${a.name} and ${b.name} have listed each other as cannot-date.`,
        severity: "block",
      });
    } else {
      const who = aBlocksB ? a.name : b.name;
      const other = aBlocksB ? b.name : a.name;
      out.push({
        label: "Organizer restriction",
        detail: `${who} has ${other} listed as cannot-date.`,
        severity: "block",
      });
    }
  }

  // Prior date that is NOT blocked — flag as a warning, not a hard stop
  if (hasPrior && !aBlocksB && !bBlocksA) {
    const who = [aDatedB && a.name, bDatedA && b.name].filter(Boolean).join(" and ");
    out.push({
      label: "Prior date history",
      detail: `${who} ha${aDatedB && bDatedA ? "ve" : "s"} this person listed in prior dates.`,
      severity: "warn",
    });
  }

  return out;
}

export function scorePair(aId: string, bId: string) {
  const a = participants.find((participant) => participant.id === aId);
  const b = participants.find((participant) => participant.id === bId);
  if (!a || !b) return null;
  return scoreParticipants(a, b);
}
