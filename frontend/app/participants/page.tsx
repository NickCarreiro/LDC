"use client";

import { AlertTriangle, ArrowUpDown, CalendarCheck, CheckCircle2, Clipboard, Download, Edit2, Eye, FileText, Mail, Search, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ActionButton } from "../../components/ActionButton";
import { AppShell } from "../../components/AppShell";
import { Modal } from "../../components/Modal";
import { useStore } from "../../lib/dataStore";

const STATUS_OPTIONS = ["Accepted", "Fee pending", "Waitlisted", "Declined", "Withdrawn"];
const FEE_OPTIONS = ["paid", "pending", "waived"];

export default function ParticipantsPage() {
  const { participants, matchDrafts, addParticipant, updateParticipant, addAuditEvent } = useStore();
  const [selectedId, setSelectedId] = useState(participants[0]?.id ?? "");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [sensitiveShown, setSensitiveShown] = useState(false);
  const [sortMode, setSortMode] = useState<"name" | "gender-age">("gender-age");
  const [copyFeedback, setCopyFeedback] = useState(false);

  const filtered = participants
    .filter((p) => {
      const textMatch = !filter.trim() ||
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.location.toLowerCase().includes(filter.toLowerCase());
      const statusMatch = !statusFilter || p.status === statusFilter;
      return textMatch && statusMatch;
    })
    .sort((a, b) => {
      if (sortMode === "gender-age") {
        if (a.gender !== b.gender) return a.gender === "Woman" ? -1 : 1;
        return a.age - b.age;
      }
      return a.name.localeCompare(b.name);
    });

  function copyEmails() {
    const emails = filtered.map((p) => p.email).filter(Boolean).join("\n");
    navigator.clipboard.writeText(emails).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }

  const selected = participants.find((p) => p.id === selectedId) ?? participants[0];

  // Edit state — tracks unsaved changes
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  function startEdit() {
    if (!selected) return;
    setEditForm({
      location: selected.location,
      phone: selected.phone,
      status: selected.status,
      fee: selected.fee,
      desiredDates: String(selected.desiredDates),
      ageRange: selected.ageRange,
      sessions: selected.sessions.join(", "),
      previousDates: selected.previousDates.join(", "),
      cannotDate: selected.cannotDate.join(", "),
      special: selected.special ? "true" : "false",
      feedback: selected.feedback ?? "",
      orientationDate: selected.orientationDate ?? "",
      welcomeEmailSent: selected.welcomeEmailSent ? "true" : "false",
    });
    setEditing(true);
  }

  function saveEdit() {
    if (!selected) return;
    // If fee is cleared (paid or waived), lift "Fee pending" status automatically
    const fee = editForm.fee;
    let status = editForm.status;
    if ((fee === "paid" || fee === "waived") && status === "Fee pending") {
      status = "Accepted";
    }
    updateParticipant(selected.id, {
      location: editForm.location,
      phone: editForm.phone,
      status,
      fee,
      desiredDates: parseInt(editForm.desiredDates) || selected.desiredDates,
      ageRange: editForm.ageRange,
      sessions: editForm.sessions.split(",").map((s) => s.trim()).filter(Boolean),
      previousDates: editForm.previousDates.split(",").map((s) => s.trim()).filter(Boolean),
      cannotDate: editForm.cannotDate.split(",").map((s) => s.trim()).filter(Boolean),
      special: editForm.special === "true",
      feedback: editForm.feedback,
      orientationDate: editForm.orientationDate || undefined,
      welcomeEmailSent: editForm.welcomeEmailSent === "true",
    });
    setEditing(false);
  }

  // Sync editForm when selected changes while editing
  function selectParticipant(id: string) {
    setSelectedId(id);
    setEditing(false);
  }

  const [form, setForm] = useState({
    firstName: "", lastName: "", gender: "Woman", age: "",
    location: "", email: "", phone: "",
    interests: "", ageRange: "", desiredDates: "3", vision: ""
  });
  const [formError, setFormError] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);

  const participantCsv = [
    "name,email,phone,status,desired_dates,age_range,location,fee",
    ...participants.map((p) =>
      [p.name, p.email, p.phone, p.status, p.desiredDates, p.ageRange, p.location, p.fee].join(",")
    )
  ].join("\n");

  function handleAdd() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("First and last name are required.");
      return;
    }
    setFormError("");
    addParticipant({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
      age: parseInt(form.age) || 0,
      location: form.location.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      interests: form.interests,
      ageRange: form.ageRange.trim(),
      desiredDates: parseInt(form.desiredDates) || 3,
      vision: form.vision.trim()
    });
    setAddSuccess(true);
  }

  function handleViewSensitive() {
    setShowSensitive(true);
    setSensitiveShown(false);
  }

  function revealSensitive() {
    setSensitiveShown(true);
    const now = new Date();
    addAuditEvent({
      actor: "local.organizer@example.org",
      action: "participant.view_sensitive",
      object: selected?.name ?? "",
      sensitivity: "Vision, contact, private notes",
      time: `Today ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    });
  }

  return (
    <AppShell active="/participants">
      <header className="page-header">
        <div>
          <p className="eyebrow">Participant CRM</p>
          <h1>Participant Records</h1>
          <p className="page-subtitle">
            Review and edit participant details, dating history, and session flags.
          </p>
        </div>
        <div className="toolbar">
          <ActionButton
            action="Search participants"
            kind="search"
            results={participants.map((p) => `${p.name} — ${p.status}, ${p.location}`)}
          >
            <Search size={18} />Search
          </ActionButton>
          <button onClick={copyEmails} title="Copy all visible emails to clipboard" type="button">
            {copyFeedback ? <><CheckCircle2 size={18} />Copied!</> : <><Clipboard size={18} />Copy Emails</>}
          </button>
          <button onClick={() => setSortMode((m) => m === "name" ? "gender-age" : "name")} title="Toggle sort order" type="button">
            <ArrowUpDown size={18} />{sortMode === "gender-age" ? "Gender → Age" : "Name A–Z"}
          </button>
          <ActionButton action="Participants CSV export" csvData={participantCsv} filename="ldc-participants.csv" kind="download">
            <Download size={18} />Export CSV
          </ActionButton>
          <button className="primary" onClick={() => { setAddSuccess(false); setFormError(""); setForm({ firstName: "", lastName: "", gender: "Woman", age: "", location: "", email: "", phone: "", interests: "", ageRange: "", desiredDates: "3", vision: "" }); setShowAdd(true); }} type="button">
            <UsersRound size={18} />Add Participant
          </button>
        </div>
      </header>

      {showAdd && (
        <Modal eyebrow="Participant CRM" title="Add Participant" onClose={() => setShowAdd(false)} size="lg">
          {addSuccess ? (
            <>
              <p style={{ marginTop: 14 }}>
                <CheckCircle2 size={16} style={{ color: "var(--green)", verticalAlign: "middle", marginRight: 6 }} />
                {form.firstName} {form.lastName} added.
              </p>
              <div className="confirm-actions">
                <button onClick={() => setShowAdd(false)} type="button">Close</button>
                <button className="primary" onClick={() => { setAddSuccess(false); setForm({ firstName: "", lastName: "", gender: "Woman", age: "", location: "", email: "", phone: "", interests: "", ageRange: "", desiredDates: "3", vision: "" }); }} type="button">Add Another</button>
              </div>
            </>
          ) : (
            <>
              {formError && <p style={{ color: "var(--ldc-red)", marginTop: 10 }}>{formError}</p>}
              <div className="form-grid">
                <label>First name <span style={{ color: "var(--ldc-red)" }}>*</span><input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></label>
                <label>Last name <span style={{ color: "var(--ldc-red)" }}>*</span><input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></label>
                <label>Gender <span style={{ color: "var(--ldc-red)" }}>*</span><select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}><option>Woman</option><option>Man</option></select></label>
                <label>Age<input type="number" min={18} max={99} value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} /></label>
                <label>Location<input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="City, State" /></label>
                <label>Email<input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></label>
                <label>Phone<input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></label>
                <label>Desired dates<input type="number" min={1} max={15} value={form.desiredDates} onChange={(e) => setForm((f) => ({ ...f, desiredDates: e.target.value }))} /></label>
                <label>Age preference<input value={form.ageRange} onChange={(e) => setForm((f) => ({ ...f, ageRange: e.target.value }))} placeholder="e.g. 25-35" /></label>
                <label>Interests (comma-separated)<input value={form.interests} onChange={(e) => setForm((f) => ({ ...f, interests: e.target.value }))} /></label>
                <label className="full">Vision statement<textarea rows={3} value={form.vision} onChange={(e) => setForm((f) => ({ ...f, vision: e.target.value }))} /></label>
              </div>
              <div className="confirm-actions">
                <button onClick={() => setShowAdd(false)} type="button">Cancel</button>
                <button className="primary" onClick={handleAdd} type="button"><UsersRound size={16} />Add</button>
              </div>
            </>
          )}
        </Modal>
      )}

      {showSensitive && selected && (
        <Modal eyebrow="Sensitive access" title={`${selected.name} — Private Record`} onClose={() => setShowSensitive(false)}>
          {!sensitiveShown ? (
            <>
              <p style={{ marginTop: 12 }}>View private record for {selected.name}. Access will be logged.</p>
              <div className="confirm-actions">
                <button onClick={() => setShowSensitive(false)} type="button">Cancel</button>
                <button className="primary" onClick={revealSensitive} type="button"><Eye size={16} />View</button>
              </div>
            </>
          ) : (
            <div className="detail-list" style={{ marginTop: 14 }}>
              <span><strong>Email</strong>{selected.email}</span>
              <span><strong>Phone</strong>{selected.phone}</span>
              <span><strong>Vision</strong>{selected.vision || "Not provided"}</span>
              <span><strong>Cannot date</strong>{selected.cannotDate.join(", ") || "None"}</span>
              <span><strong>Feedback</strong>{selected.feedback || "None"}</span>
              <span><strong>Private note</strong>{selected.special ? "Yes" : "None"}</span>
            </div>
          )}
        </Modal>
      )}

      <section className="status-strip">
        <div className="status-card"><span>Total</span><strong>{participants.length}</strong><small>{participants.filter(p => p.gender === "Woman").length}w / {participants.filter(p => p.gender === "Man").length}m</small></div>
        <div className="status-card"><span>Accepted</span><strong>{participants.filter((p) => p.status === "Accepted").length}</strong><small>Summer 2026</small></div>
        <div className="status-card important"><span>Fee pending</span><strong>{participants.filter((p) => p.fee === "pending").length}</strong><small>need confirmation</small></div>
        <div className="status-card"><span>Special needs flag</span><strong>{participants.filter((p) => p.special).length}</strong><small>max 1 date of this type per woman</small></div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Directory · {filtered.length} of {participants.length}</p>
              <h2>Summer 2026 Participants</h2>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                placeholder="Search by name or location…"
                style={{ width: 190, minHeight: 36, padding: "6px 10px", fontSize: 13 }}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 140, minHeight: 36, padding: "6px 10px", fontSize: 13 }}
              >
                <option value="">All statuses</option>
                <option>Accepted</option>
                <option>Fee pending</option>
                <option>Waitlisted</option>
                <option>Declined</option>
                <option>Withdrawn</option>
              </select>
              <Link className="button-link" href="/forms/summer-2026"><FileText size={18} />Fields</Link>
            </div>
          </div>
          <div className="data-table">
            <div className="data-row data-head">
              <span>Participant</span>
              <span>Contact</span>
              <span>Preferences</span>
              <span>Status</span>
            </div>
            {filtered.map((participant) => (
              <div
                className={`data-row clickable${participant.id === selectedId ? " selected-row" : ""}`}
                key={participant.id}
                onClick={() => selectParticipant(participant.id)}
              >
                <span className="person-cell">
                  <b className="avatar">{participant.initials}</b>
                  <span>
                    <strong>{participant.name}</strong>
                    <small>{participant.gender}, {participant.age} · {participant.location}</small>
                  </span>
                </span>
                <span>
                  <Mail size={15} />
                  {participant.email}
                </span>
                <span>
                  {participant.desiredDates} dates · ages {participant.ageRange}
                  <small>{participant.interests.slice(0, 3).join(", ")}</small>
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                  <span className={participant.special ? "status-pill warning" : "status-pill"}>
                    {participant.special ? "Organizer review" : participant.status}
                  </span>
                  <span style={{ display: "flex", gap: 6, fontSize: 11, color: "var(--muted)" }}>
                    <span title="Orientation">
                      <CalendarCheck size={12} style={{ verticalAlign: "middle", marginRight: 2 }} />
                      {participant.orientationDate ?? "—"}
                    </span>
                    <span title="Welcome email">
                      <Mail size={12} style={{ verticalAlign: "middle", marginRight: 2 }} />
                      {participant.welcomeEmailSent ? "Sent" : "—"}
                    </span>
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <aside className="panel profile-panel">
            <div className="section-head">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <b className="avatar" style={{ width: 46, height: 46, fontSize: 15, borderRadius: 10, flexShrink: 0 }}>{selected.initials}</b>
                <div>
                  <p className="eyebrow" style={{ marginBottom: 2 }}>Profile</p>
                  <h2 style={{ marginBottom: 2 }}>{selected.name}</h2>
                  <small style={{ color: "var(--muted)", fontSize: 12 }}>{selected.gender}, {selected.age}</small>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} type="button"><X size={16} /></button>
                    <button className="primary" onClick={saveEdit} type="button"><CheckCircle2 size={16} />Save</button>
                  </>
                ) : (
                  <>
                    <button onClick={handleViewSensitive} type="button"><Eye size={16} />View</button>
                    <button className="primary" onClick={startEdit} type="button"><Edit2 size={16} />Edit</button>
                  </>
                )}
              </div>
            </div>

            {editing ? (
              <div className="profile-edit-grid">
                <label>Location<input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} /></label>
                <label>Phone<input type="tel" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} /></label>
                <label>Status
                  <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>Fee
                  <select
                    value={editForm.fee}
                    onChange={(e) => {
                      const fee = e.target.value;
                      setEditForm((f) => ({
                        ...f,
                        fee,
                        // Auto-lift "Fee pending" status when fee is cleared
                        status: (fee === "paid" || fee === "waived") && f.status === "Fee pending" ? "Accepted" : f.status,
                      }));
                    }}
                  >
                    {FEE_OPTIONS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </label>
                <label>Desired dates<input type="number" min={1} max={20} value={editForm.desiredDates} onChange={(e) => setEditForm((f) => ({ ...f, desiredDates: e.target.value }))} /></label>
                <label>Age preference<input value={editForm.ageRange} onChange={(e) => setEditForm((f) => ({ ...f, ageRange: e.target.value }))} placeholder="e.g. 24-34" /></label>
                <label>Sessions (comma-separated)<input value={editForm.sessions} onChange={(e) => setEditForm((f) => ({ ...f, sessions: e.target.value }))} /></label>
                <label>Prior dates (comma-separated)<input value={editForm.previousDates} onChange={(e) => setEditForm((f) => ({ ...f, previousDates: e.target.value }))} /></label>
                <label>Cannot-date (comma-separated)<input value={editForm.cannotDate} onChange={(e) => setEditForm((f) => ({ ...f, cannotDate: e.target.value }))} /></label>
                <label>Special needs flag
                  <select value={editForm.special} onChange={(e) => setEditForm((f) => ({ ...f, special: e.target.value }))}>
                    <option value="false">No</option>
                    <option value="true">Yes — limits each woman to 1 date with this person</option>
                  </select>
                </label>
                <label>Organizer notes<textarea rows={3} value={editForm.feedback} onChange={(e) => setEditForm((f) => ({ ...f, feedback: e.target.value }))} /></label>
                <label>Orientation date
                  <input
                    placeholder="e.g. May 17"
                    value={editForm.orientationDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, orientationDate: e.target.value }))}
                  />
                </label>
                <label>Welcome email sent
                  <select value={editForm.welcomeEmailSent} onChange={(e) => setEditForm((f) => ({ ...f, welcomeEmailSent: e.target.value }))}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </label>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Email, age, interests, and vision are read-only.</p>
              </div>
            ) : (() => {
              // Drafts this person is in
              const myDrafts = matchDrafts.filter((d) =>
                d.participantAId === selected.id || d.participantBId === selected.id ||
                d.pair.includes(selected.name)
              );
              return (
                <>
                  <div className="detail-list">
                    <span><strong>Location</strong>{selected.location}</span>
                    <span><strong>Status</strong>{selected.status}</span>
                    <span><strong>Fee</strong>{selected.fee}</span>
                    <span><strong>Sessions</strong>{selected.sessions.join(", ")}</span>
                    <span><strong>Wants</strong>{selected.desiredDates} dates · ages {selected.ageRange}</span>
                    {selected.cannotDate.length > 0 && <span><strong>Cannot-date</strong>{selected.cannotDate.join(", ")}</span>}
                    <span><strong>Orientation</strong>{selected.orientationDate ?? "Not recorded"}</span>
                    <span><strong>Welcome email</strong>{selected.welcomeEmailSent ? "Sent" : "Not sent"}</span>
                  </div>

                  {/* Current match drafts */}
                  <div style={{ marginTop: 14 }}>
                    <p className="eyebrow" style={{ marginBottom: 8 }}>Curation sheet entries — all statuses ({myDrafts.length})</p>
                    {myDrafts.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--muted)" }}>No pairs drafted yet for this person.</p>
                    ) : (
                      <div className="check-list">
                        {myDrafts.map((d) => {
                          const partner = d.pair.replace(selected.name + " + ", "").replace(" + " + selected.name, "").trim();
                          const pill = d.status === "Approved" ? "status-pill"
                            : d.status === "Sent" ? "status-pill sent"
                            : d.status === "Needs review" ? "status-pill warning"
                            : "status-pill muted";
                          return (
                            <span key={d.pair} style={{ justifyContent: "space-between" }}>
                              <span>{partner}</span>
                              <span className={pill} style={{ fontSize: 11 }}>{d.status}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Prior dating history */}
                  <div style={{ marginTop: 14 }}>
                    <p className="eyebrow" style={{ marginBottom: 8 }}>Prior date history</p>
                    {!selected.previousDates.some((d) => d !== "new to the club") ? (
                      <p style={{ fontSize: 13, color: "var(--muted)" }}>New to the club — no prior dates recorded.</p>
                    ) : (
                      <div className="check-list">
                        {selected.previousDates.filter((d) => d !== "new to the club").map((name) => (
                          <span key={name} style={{ justifyContent: "space-between" }}>
                            <span>{name}</span>
                            {selected.cannotDate.includes(name)
                              ? <span className="status-pill warning" style={{ fontSize: 11 }}>Blocked — in cannot-date</span>
                              : <span className="status-pill muted" style={{ fontSize: 11 }}>Eligible to repeat</span>
                            }
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {selected.vision && (
                    <div className="note-box" style={{ marginTop: 12 }}>
                      <strong>Vision statement</strong>
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>{selected.vision}</span>
                    </div>
                  )}
                  {selected.feedback && (
                    <div className="note-box" style={{ marginTop: 8 }}>
                      <strong>Notes</strong>
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>{selected.feedback}</span>
                    </div>
                  )}
                  <div className="check-list" style={{ marginTop: 12 }}>
                    {selected.special && <span><AlertTriangle size={17} />Special needs flag set</span>}
                    {selected.cannotDate.length > 0 && <span><AlertTriangle size={17} />Cannot-date set</span>}
                    <span><CheckCircle2 size={17} />Statements signed</span>
                  </div>
                </>
              );
            })()}
          </aside>
        )}
      </section>
    </AppShell>
  );
}
