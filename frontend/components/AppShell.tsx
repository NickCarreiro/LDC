"use client";

import {
  CalendarDays,
  ClipboardList,
  FileText,
  GitMerge,
  HeartHandshake,
  KeyRound,
  LockKeyhole,
  Mail,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

function clog(message: string) {
  fetch("/api/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "APP", message }),
  }).catch(() => {});
}

const navItems = [
  { href: "/", label: "Dashboard", icon: ClipboardList },
  { href: "/forms/summer-2026", label: "Intake Forms", icon: FileText },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/participants", label: "Participants", icon: UsersRound },
  { href: "/matching", label: "Match Workbench", icon: HeartHandshake },
  { href: "/matches", label: "Curation Table", icon: GitMerge },
  { href: "/drafts", label: "Draft Emails", icon: Mail },
  { href: "/audit", label: "Audit", icon: LockKeyhole },
  { href: "/account", label: "Account", icon: KeyRound }
];

// sessionStorage is used only as a UI hint to avoid a flash of the login form
// on page load. The real auth check is the server-side cookie via /api/auth/verify.
function getStoredHint() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("ldc_auth") === "1";
}

export function AppShell({ active, children, isPublic = false }: { active: string; children: ReactNode; isPublic?: boolean }) {
  const [authed, setAuthed] = useState(getStoredHint);
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // On mount, verify the session cookie server-side. If the sessionStorage hint
  // was forged (or the cookie expired), this resets the auth state correctly.
  useEffect(() => {
    if (isPublic) return;
    fetch("/api/auth/verify")
      .then((r) => {
        if (r.ok) {
          sessionStorage.setItem("ldc_auth", "1");
          setAuthed(true);
        } else {
          sessionStorage.removeItem("ldc_auth");
          setAuthed(false);
        }
      })
      .catch(() => { /* network error — keep current hint state */ });
  }, [isPublic]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(false);
    clog("login attempt");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        sessionStorage.setItem("ldc_auth", "1");
        setAuthed(true);
        setPw("");
        clog("login success");
      } else {
        setError(true);
        setPw("");
        clog("login failed");
      }
    } catch {
      setError(true);
      setPw("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    sessionStorage.removeItem("ldc_auth");
    setAuthed(false);
    setPw("");
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
                disabled={submitting}
              />
            </label>
            {error && <p className="login-error">Incorrect password.</p>}
            <button className="primary" style={{ width: "100%", marginTop: 14 }} type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
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
              onClick={handleLogout}
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
