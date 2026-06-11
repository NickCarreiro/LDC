"use client";

export function WorkflowWidget() {
  return (
    <div className="workflow-guide-widget">
      <strong className="workflow-label">Workflow</strong>
      <div className="workflow-steps">
        {[
          "1 · Review registrations in Sessions",
          "2 · Manage participants",
          "3 · Curate pairs in Match Workbench",
          "4 · Approve drafts",
          "5 · Generate & send emails in Draft Emails",
        ].map((step, i, arr) => (
          <span key={step} className="workflow-step-group">
            <span className="workflow-step">{step}</span>
            {i < arr.length - 1 && <span className="workflow-arrow">→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
