"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type ActionKind = "message" | "search" | "download" | "scroll";

type ActionButtonProps = {
  action: string;
  children: ReactNode;
  className?: string;
  csvData?: string;
  filename?: string;
  kind?: ActionKind;
  message?: string;
  results?: string[];
  targetId?: string;
};

export function ActionButton({
  action,
  children,
  className,
  csvData,
  filename = "export.csv",
  kind = "message",
  message,
  results,
  targetId
}: ActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Escape key closes any open dialog
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filteredResults = useMemo(() => {
    if (!results) return [];
    if (!query.trim()) return results;
    return results.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  }, [query, results]);

  function downloadCsv() {
    if (!csvData) return;
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function handleClick() {
    if (kind === "download") {
      downloadCsv();
      // Don't open a dialog — the download is the action
      return;
    }
    if (kind === "scroll" && targetId) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button className={className} data-action={action} onClick={handleClick} type="button">
        {children}
      </button>
      {open && (
        <div className="action-overlay" role="presentation" onClick={() => setOpen(false)}>
          <section
            aria-modal="true"
            className="action-dialog"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-head">
              <div>
                <p className="eyebrow">{action}</p>
                <h2>{kind === "search" ? "Search" : action}</h2>
              </div>
              <button aria-label="Close dialog" onClick={() => setOpen(false)} type="button">
                Close
              </button>
            </div>
            {kind === "search" ? (
              <>
                <input
                  autoFocus
                  aria-label="Search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type to filter…"
                  value={query}
                />
                <div className="action-results">
                  {filteredResults.map((item) => (
                    <span
                      key={item}
                      style={{ cursor: "pointer" }}
                      onClick={() => setOpen(false)}
                    >
                      {item}
                    </span>
                  ))}
                  {!filteredResults.length && results && results.length > 0 && (
                    <span style={{ color: "var(--muted)" }}>No results match.</span>
                  )}
                  {!results?.length && (
                    <span style={{ color: "var(--muted)" }}>No records available.</span>
                  )}
                </div>
              </>
            ) : (
              <p>{message}</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
