"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function BeforeMatchingWidget() {
  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">Reminders — not tracked here</p>
          <h2>Before Matching</h2>
        </div>
      </div>
      <div className="check-list">
        <span><CheckCircle2 size={17} />Conduct acknowledgement collected from all participants</span>
        <span><CheckCircle2 size={17} />Safety statement collected from all participants</span>
        <span><CheckCircle2 size={17} />Liability statement collected from all participants</span>
        <span><AlertTriangle size={17} />Cannot-date constraints entered in each profile</span>
        <span><AlertTriangle size={17} />Special-needs flags reviewed in each profile</span>
      </div>
    </>
  );
}
