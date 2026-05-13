"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CircleDot,
  DollarSign,
  FileText,
  ListChecks,
  ShieldCheck,
  TextCursorInput,
  UserCheck
} from "lucide-react";

import Link from "next/link";

import { AppShell } from "../../../components/AppShell";
import { ActionButton } from "../../../components/ActionButton";
import { Modal } from "../../../components/Modal";
import { IntakeField, summer2026Form } from "../../../lib/summer2026Form";
import { useState } from "react";

const sections = [
  {
    id: "identity",
    title: "Identity and Contact",
    description: "Names, contact information, gender, age, and location for date planning.",
    fields: ["first_name", "last_name", "phone", "email", "gender", "age", "city_state"]
  },
  {
    id: "preferences",
    title: "Dating Preferences",
    description: "Age range, maximum date count, interests, and referral source.",
    fields: ["age_range", "max_dates", "interests", "referral_source"]
  },
  {
    id: "commitments",
    title: "Commitments and Acknowledgements",
    description: "Required consent trail for dates, locations, conduct, safety, and liability.",
    fields: ["date_commitment_ack", "code_of_conduct_ack", "safety_ack", "liability_ack"]
  },
  {
    id: "history",
    title: "History and Organizer Context",
    description: "Previous dates, cannot-date constraints, and private vision statement.",
    fields: ["previous_dates", "cannot_date", "vision_statement"]
  }
];

function FieldControl({ field }: { field: IntakeField }) {
  if (field.type === "long_text") {
    return <textarea aria-label={field.label} rows={4} placeholder="Organizer preview field" />;
  }

  if (field.type === "dropdown") {
    return (
      <select aria-label={field.label}>
        <option value="">Select</option>
        {field.options?.map((option) => <option key={option}>{option}</option>)}
      </select>
    );
  }

  if (field.type === "radio" || field.type === "checkboxes" || field.type === "statement_checkbox") {
    const inputType = field.type === "radio" ? "radio" : "checkbox";
    return (
      <div className={field.options && field.options.length > 8 ? "option-grid dense" : "option-grid"}>
        {field.options?.map((option) => (
          <label className="choice-pill" key={option}>
            <input type={inputType} name={field.key} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      aria-label={field.label}
      placeholder="Organizer preview field"
      type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
    />
  );
}

function FieldIcon({ type }: { type: IntakeField["type"] }) {
  if (type === "checkboxes" || type === "statement_checkbox") return <CheckSquare size={18} />;
  if (type === "radio") return <CircleDot size={18} />;
  if (type === "long_text") return <FileText size={18} />;
  if (type === "dropdown") return <ListChecks size={18} />;
  return <TextCursorInput size={18} />;
}

function fieldByKey(key: string) {
  return summer2026Form.fields.find((field) => field.key === key);
}

export default function Summer2026FormPage() {
  const requiredCount = summer2026Form.fields.filter((field) => field.required).length;
  const privateCount = summer2026Form.fields.filter((field) => field.private).length;
  const [showAttach, setShowAttach] = useState(false);
  const [attached, setAttached] = useState(false);

  return (
    <AppShell active="/forms/summer-2026" isPublic={true}>
        <header className="page-header form-hero">
          <div>
            <p className="eyebrow">Organizer-managed intake</p>
            <h1>{summer2026Form.title}</h1>
            <p className="page-subtitle">
              A structured replacement for the Google Form, grouped by the way organizers review registrations.
            </p>
          </div>
          <div className="toolbar">
            <ActionButton action="Summer 2026 details" kind="scroll" targetId="identity">
              <CalendarDays size={18} />Summer 2026
            </ActionButton>
            <Link className="button-link" href="/forms/summer-2026/register" target="_blank">
              <FileText size={18} />Preview Sign-Up Form
            </Link>
            <button className="primary" onClick={() => { setAttached(false); setShowAttach(true); }} type="button">
              <UserCheck size={18} />Use for Session
            </button>
          </div>
        </header>

        {showAttach && (
          <Modal eyebrow="Session configuration" title="Attach Form to Session" onClose={() => setShowAttach(false)}>
            {attached ? (
              <>
                <p style={{ marginTop: 14 }}>
                  <CheckCircle2 size={16} style={{ color: "var(--green)", verticalAlign: "middle", marginRight: 6 }} />
                  The Summer 2026 intake form is now attached to the Summer 2026 session. Submissions will be mapped to participant and registration records.
                </p>
                <div className="confirm-actions">
                  <button className="primary" onClick={() => setShowAttach(false)} type="button">Done</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ marginTop: 14 }}>
                  Attach this form to a session.
                </p>
                <div className="detail-list" style={{ marginTop: 16 }}>
                  <span><strong>Form</strong>{summer2026Form.title}</span>
                  <span><strong>Session</strong>Summer 2026</span>
                  <span><strong>Fields</strong>{summer2026Form.fields.length} ({requiredCount} required, {privateCount} organizer-only)</span>
                  <span><strong>Deadline</strong>{summer2026Form.deadline}</span>
                </div>
                <div className="confirm-actions">
                  <button onClick={() => setShowAttach(false)} type="button">Cancel</button>
                  <button className="primary" onClick={() => setAttached(true)} type="button">
                    <UserCheck size={16} />Confirm Attachment
                  </button>
                </div>
              </>
            )}
          </Modal>
        )}

        <section className="status-strip" aria-label="Form summary">
          <div className="status-card important">
            <span>Deadline</span>
            <strong>{summer2026Form.deadline}</strong>
            <small>registration cutoff from the printout</small>
          </div>
          <div className="status-card">
            <span>Required fields</span>
            <strong>{requiredCount}</strong>
            <small>must be captured before review</small>
          </div>
          <div className="status-card">
            <span>Private fields</span>
            <strong>{privateCount}</strong>
            <small>organizer-only visibility</small>
          </div>
          <div className="status-card">
            <span>Donation</span>
            <strong>{summer2026Form.donation.suggestedAmount}</strong>
            <small>Zelle and Venmo stored for reference</small>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Capacity</p>
                <h2>Signup Notices</h2>
              </div>
              <AlertTriangle size={20} />
            </div>
            <div className="check-list">
              {summer2026Form.notices.map((notice) => <span key={notice}><AlertTriangle size={17} />{notice}</span>)}
            </div>
          </div>

          <div className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Payment</p>
                <h2>Donation Links</h2>
              </div>
              <DollarSign size={20} />
            </div>
            <div className="detail-list">
              <span><strong>Suggested</strong>{summer2026Form.donation.suggestedAmount}</span>
              <span><strong>Zelle</strong>{summer2026Form.donation.zelle}</span>
              <span><strong>Venmo</strong>{summer2026Form.donation.venmo}</span>
            </div>
          </div>

          <div className="panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">New participants</p>
                <h2>Orientation Windows</h2>
              </div>
              <CalendarDays size={20} />
            </div>
            <div className="detail-list">
              {summer2026Form.orientations.map((orientation) => <span key={orientation}>{orientation}</span>)}
            </div>
          </div>
        </section>

        <section className="form-workspace">
          <aside className="panel form-index">
            <div className="section-head">
              <div>
                <p className="eyebrow">Sections</p>
                <h2>Review Flow</h2>
              </div>
            </div>
            <div className="mapping-list">
              {sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>{section.title}</a>
              ))}
            </div>
            <div className="policy-box">
              <ShieldCheck size={20} />
              <strong>Organizer-only fields</strong>
              <span>Vision statement, cannot-date constraints, and prior history are visible to organizers only.</span>
            </div>
          </aside>

          <div className="form-sections">
            {sections.map((section) => (
              <section className="panel form-section" id={section.id} key={section.id}>
                <div className="section-head">
                  <div>
                    <p className="eyebrow">{section.fields.length} fields</p>
                    <h2>{section.title}</h2>
                    <p>{section.description}</p>
                  </div>
                </div>

                <div className="field-grid">
                  {section.fields.map((key) => {
                    const field = fieldByKey(key);
                    if (!field) return null;
                    return (
                      <article className={field.type === "checkboxes" ? "field-card wide" : "field-card"} key={field.key}>
                        <div className="field-topline">
                          <span className="number-badge">{field.number}</span>
                          <FieldIcon type={field.type} />
                          {field.required && <strong>Required</strong>}
                          {field.private && <em>Organizer-only</em>}
                        </div>
                        <h3>{field.label}</h3>
                        {field.helpText && <p>{field.helpText}</p>}
                        <FieldControl field={field} />
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>

    </AppShell>
  );
}
