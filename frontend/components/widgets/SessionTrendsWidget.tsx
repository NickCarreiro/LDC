"use client";

import { BarChart3 } from "lucide-react";

import { useStore } from "../../lib/dataStore";

export function SessionTrendsWidget() {
  const { sessions } = useStore();

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">Longitudinal</p>
          <h2>Session Trends</h2>
        </div>
        <BarChart3 size={20} />
      </div>
      <div className="trend-grid">
        {sessions.map((session, i) => {
          const repM = session.men > 0 ? Math.round((session.repeatMen / session.men) * 100) : 0;
          const repW =
            session.women > 0 ? Math.round((session.repeatWomen / session.women) * 100) : 0;
          const barW = session.size > 0 ? (session.men / session.size) * 100 : 50;
          return (
            <article className="trend-card" key={`${session.name}-${i}`}>
              <strong>{session.name}</strong>
              <span>{session.size} participants</span>
              <div className="bar" aria-hidden="true">
                <i style={{ width: `${barW}%` }} />
              </div>
              <small>
                {session.men}m / {session.women}f · Repeat {repM}% / {repW}%
              </small>
            </article>
          );
        })}
      </div>
    </>
  );
}
