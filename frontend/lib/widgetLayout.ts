export type WidgetId =
  | "session-header"
  | "status-stats"
  | "workflow-guide"
  | "quick-links"
  | "queue-stats"
  | "approve-drafts"
  | "participants-table"
  | "before-matching"
  | "match-workbench"
  | "draft-matches"
  | "session-trends";

export type WidgetSize = 1 | 2;

export interface WidgetConfig {
  id: WidgetId;
  size: WidgetSize;
  enabled: boolean;
}

export interface WidgetMeta {
  label: string;
  description: string;
  defaultSize: WidgetSize;
  fixedSize?: true; // cannot be resized
}

export const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  "session-header": {
    label: "Session Header",
    description: "Title, dates, deadline, and toolbar actions",
    defaultSize: 2,
    fixedSize: true,
  },
  "status-stats": {
    label: "Session Stats",
    description: "Men/women registered, fee pending, pending approvals",
    defaultSize: 2,
  },
  "workflow-guide": {
    label: "Workflow Guide",
    description: "Step-by-step process reminder strip",
    defaultSize: 2,
    fixedSize: true,
  },
  "quick-links": {
    label: "Quick Links",
    description: "Jump-to cards for intake, registrations, matching, and audit",
    defaultSize: 2,
  },
  "queue-stats": {
    label: "Queue Stats",
    description: "Total participants, review flags, drafts, emails ready",
    defaultSize: 2,
  },
  "approve-drafts": {
    label: "Approve Drafts",
    description: "Review and approve pending match pairs in-line",
    defaultSize: 1,
  },
  "participants-table": {
    label: "Participants Table",
    description: "Live preview of the most recent registrations",
    defaultSize: 2,
  },
  "before-matching": {
    label: "Before Matching Checklist",
    description: "Compliance and safety reminders before curating pairs",
    defaultSize: 1,
  },
  "match-workbench": {
    label: "Match Workbench",
    description: "Dry-run compatibility scorer — pick a man and woman",
    defaultSize: 1,
  },
  "draft-matches": {
    label: "Draft Matches",
    description: "Recent match draft pairs with status",
    defaultSize: 1,
  },
  "session-trends": {
    label: "Session Trends",
    description: "Historical session size, gender ratio, and repeat rates",
    defaultSize: 2,
  },
};

export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: "session-header",    size: 2, enabled: true },
  { id: "status-stats",      size: 2, enabled: true },
  { id: "workflow-guide",    size: 2, enabled: true },
  { id: "quick-links",       size: 2, enabled: true },
  { id: "queue-stats",       size: 2, enabled: true },
  { id: "approve-drafts",    size: 1, enabled: true },
  { id: "participants-table",size: 2, enabled: true },
  { id: "before-matching",   size: 1, enabled: true },
  { id: "match-workbench",   size: 1, enabled: true },
  { id: "draft-matches",     size: 1, enabled: true },
  { id: "session-trends",    size: 2, enabled: true },
];

const STORAGE_KEY = "ldc_dashboard_layout_v2";

export function loadLayout(): WidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as WidgetConfig[];
    // Merge any new widgets added since the layout was last saved
    const ids = new Set(parsed.map((w) => w.id));
    const merged = [...parsed];
    for (const def of DEFAULT_LAYOUT) {
      if (!ids.has(def.id)) merged.push(def);
    }
    return merged;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(layout: WidgetConfig[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch { /* quota */ }
}

export function resetLayout(): WidgetConfig[] {
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
  return DEFAULT_LAYOUT;
}
