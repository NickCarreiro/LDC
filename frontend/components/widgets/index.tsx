import type { ReactNode } from "react";

import { ApproveDraftsWidget } from "./ApproveDraftsWidget";
import { BeforeMatchingWidget } from "./BeforeMatchingWidget";
import { DraftMatchesWidget } from "./DraftMatchesWidget";
import { MatchWorkbenchWidget } from "./MatchWorkbenchWidget";
import { ParticipantsTableWidget } from "./ParticipantsTableWidget";
import { QueueStatsWidget } from "./QueueStatsWidget";
import { QuickLinksWidget } from "./QuickLinksWidget";
import { SessionTrendsWidget } from "./SessionTrendsWidget";
import { StatusStatsWidget } from "./StatusStatsWidget";
import { WorkflowWidget } from "./WorkflowWidget";
import type { WidgetId } from "../../lib/widgetLayout";

// session-header is rendered by the page itself (not in the grid)
export const WIDGET_COMPONENTS: Partial<Record<WidgetId, () => ReactNode>> = {
  "status-stats":       () => <StatusStatsWidget />,
  "workflow-guide":     () => <WorkflowWidget />,
  "quick-links":        () => <QuickLinksWidget />,
  "queue-stats":        () => <QueueStatsWidget />,
  "approve-drafts":     () => <ApproveDraftsWidget />,
  "participants-table": () => <ParticipantsTableWidget />,
  "before-matching":    () => <BeforeMatchingWidget />,
  "match-workbench":    () => <MatchWorkbenchWidget />,
  "draft-matches":      () => <DraftMatchesWidget />,
  "session-trends":     () => <SessionTrendsWidget />,
};
