"use client";

import { useState } from "react";

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("New password and confirmation do not match.");
      return;
    }

    setStatus("saving");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Could not change password.");
        return;
      }
      setStatus("ok");
      setMessage("Password changed. Use the new password next time you sign in.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setStatus("error");
      setMessage("Network error — could not reach the server.");
    }
  }

  return (
    <div>
      <h1>Account</h1>
      <section className="content-grid" style={{ marginTop: 14 }}>
        <div className="panel span-2" style={{ maxWidth: 420 }}>
          <h3>Change Organizer Password</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" disabled={status === "saving"}>
              {status === "saving" ? "Saving..." : "Change Password"}
            </button>
            {message && (
              <p style={{ color: status === "error" ? "var(--danger, #c0392b)" : "var(--success, #2e7d32)" }}>
                {message}
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
