"use client";

import { FileText, HeartHandshake, LockKeyhole, UserCheck } from "lucide-react";
import Link from "next/link";

const OPERATIONS = [
  {
    title: "Intake Form",
    text: "Manage the Summer 2026 signup form and field mapping.",
    href: "/forms/summer-2026",
    icon: FileText,
  },
  {
    title: "Registration Review",
    text: "Accept, waitlist, or decline participants and track fee status.",
    href: "/sessions",
    icon: UserCheck,
  },
  {
    title: "Manual Matching",
    text: "Curate pairs, dry-run compatibility, and check prior history.",
    href: "/matching",
    icon: HeartHandshake,
  },
  {
    title: "Export and Audit",
    text: "Export CSVs and review the access log.",
    href: "/audit",
    icon: LockKeyhole,
  },
];

export function QuickLinksWidget() {
  return (
    <section className="feature-grid" style={{ marginTop: 0 }}>
      {OPERATIONS.map((item) => {
        const Icon = item.icon;
        return (
          <Link className="feature-card" href={item.href} key={item.title}>
            <Icon size={22} />
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </Link>
        );
      })}
    </section>
  );
}
