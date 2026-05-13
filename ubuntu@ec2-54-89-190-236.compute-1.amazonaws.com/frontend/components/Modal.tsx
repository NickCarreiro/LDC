"use client";

import { type ReactNode } from "react";

export function Modal({
  title,
  eyebrow = "Action",
  onClose,
  size = "md",
  children,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  return (
    <div className="action-overlay" role="presentation" onClick={onClose}>
      <section
        aria-modal="true"
        className={size === "lg" ? "action-dialog lg" : "action-dialog"}
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button aria-label="Close dialog" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
