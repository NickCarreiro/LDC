"use client";

import {
  CalendarDays,
  ClipboardList,
  FileText,
  GitMerge,
  HeartHandshake,
  LockKeyhole,
  Mail,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: ClipboardList },
  { href: "/forms/summer-2026", label: "Intake Forms", icon: FileText },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/participants", label: "Participants", icon: UsersRound },
  { href: "/matching", label: "Match Workbench", icon: HeartHandshake },
  { href: "/matches", label: "Curation Table", icon: GitMerge },
  { href: "/drafts", label: "Draft Emails", icon: Mail },
  { href: "/audit", label: "Audit", icon: LockKeyhole }
];

const PASS = "ldc2026";

function getInitialAuth() {
  // Lazy initializer runs synchronously on client — no hydration flicker
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("ldc_auth") === "1";
}

export function AppShell({ active, children, isPublic = false }: { active: string; children: ReactNode; isPublic?: boolean }) {
  const [authed, setAuthed] = useState(getInitialAuth);
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pw === PASS) {
      sessionStorage.setItem("ldc_auth", "1");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setPw("");
    }
  }

  if (!isPublic && !authed) {
    return (
      <main className="login-screen">
        <div className="login-card">
          <img src="/brand/little-dates-club-logo-sidebar.png" alt="Little Dates Club" />
          <h2>LDC Operations</h2>
          <p>Organizer access only.</p>
          <form onSubmit={handleLogin}>
            <label>
              Password
              <input
                autoFocus
                type="password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError(false); }}
                placeholder="Enter password"
              />
            </label>
            {error && <p className="login-error">Incorrect password.</p>}
            <button className="primary" style={{ width: "100%", marginTop: 14 }} type="submit">
              Sign in
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="side-rail">
        <div className="logo-card">
          <img src="/brand/little-dates-club-logo-sidebar.png" alt="Little Dates Club" />
        </div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link className={active === item.href ? "active" : undefined} href={item.href} key={item.href}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {!isPublic && authed && (
          <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <button
              onClick={() => { sessionStorage.removeItem("ldc_auth"); setAuthed(false); setPw(""); }}
              style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.18)", color: "#c8d8ec", fontSize: 13 }}
              type="button"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
      <section className="app-main">{children}</section>
    </main>
  );
}
