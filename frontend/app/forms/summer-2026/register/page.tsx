"use client";

import { AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { summer2026Form } from "../../../../lib/summer2026Form";

type Values = Record<string, string | string[]>;
type PhotoState = { file: File; preview: string } | null;

const SECTIONS = [
  {
    id: "identity",
    title: "Identity and Contact",
    desc: "Basic information for registration and date coordination.",
    keys: ["first_name", "last_name", "phone", "email", "city_state"]
  },
  {
    id: "preferences",
    title: "About You",
    desc: "Gender, age, dating preferences, interests, and how you found the club.",
    keys: ["gender", "age", "age_range", "max_dates", "interests", "referral_source"]
  },
  {
    id: "commitments",
    title: "Agreements",
    desc: "Required acknowledgements before your registration can be reviewed.",
    keys: ["date_commitment_ack", "code_of_conduct_ack", "safety_ack", "liability_ack"]
  },
  {
    id: "history",
    title: "History",
    desc: "Previous LDC participation and any constraints the organizers need to know.",
    keys: ["previous_dates", "cannot_date"]
  }
];

const fieldMap = Object.fromEntries(summer2026Form.fields.map((f) => [f.key, f]));

export default function RegisterPage() {
  const [values, setValues] = useState<Values>({});
  const [photo, setPhoto] = useState<PhotoState>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const firstErrorRef = useRef<HTMLDivElement>(null);

  // Revoke object URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (photo?.preview) URL.revokeObjectURL(photo.preview);
    };
  }, [photo]);

  function setVal(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photo?.preview) URL.revokeObjectURL(photo.preview);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  function toggleOption(key: string, option: string) {
    const current = (values[key] as string[]) ?? [];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    setValues((prev) => ({ ...prev, [key]: next }));
  }

  // Derive age_range string (min-max) from checked age array
  function ageRangeString(): string {
    const arr = (values.age_range as string[] | undefined) ?? [];
    if (!arr.length) return "";
    const nums = arr.map(Number).filter(Boolean);
    if (!nums.length) return "";
    return `${Math.min(...nums)}-${Math.max(...nums)}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing: string[] = [];
    const firstMissingKey: string[] = [];
    SECTIONS.forEach((section) => {
      section.keys.forEach((key) => {
        const field = fieldMap[key];
        if (!field?.required) return;
        const val = values[key];
        if (!val || (Array.isArray(val) && val.length === 0) || val === "") {
          missing.push(field.label);
          if (!firstMissingKey.length) firstMissingKey.push(key);
        }
      });
    });
    if (missing.length > 0) {
      setErrors(missing);
      // Scroll to error list and focus first invalid field
      setTimeout(() => {
        firstErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        const el = document.querySelector<HTMLElement>(`[data-field="${firstMissingKey[0]}"] input, [data-field="${firstMissingKey[0]}"] select, [data-field="${firstMissingKey[0]}"] textarea`);
        el?.focus();
      }, 100);
      return;
    }
    setErrors([]);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return (
      <div className="public-form-page">
        <div className="public-form-container">
          <div className="public-form-header">
            <img src="/brand/little-dates-club-logo-sidebar.png" alt="Little Dates Club" />
          </div>
          <div className="public-form-success">
            <CheckCircle2 size={44} />
            <h2>Sign-up received</h2>
            <p>
              Thank you for signing up for Summer 2026. The organizing team will follow up once your application has been reviewed.
              New participants should plan to attend one of the orientation sessions listed below.
            </p>
            <div className="public-form-payment">
              <DollarSign size={20} />
              <strong>Complete your donation</strong>
              <p>Suggested amount: {summer2026Form.donation.suggestedAmount}</p>
              <span>Zelle: {summer2026Form.donation.zelle}</span>
              <span>Venmo: {summer2026Form.donation.venmo}</span>
            </div>
            <div style={{ marginTop: 20, color: "var(--muted)", fontSize: 13 }}>
              <strong style={{ display: "block", color: "var(--ink)", marginBottom: 6 }}>Orientation dates (new participants)</strong>
              {summer2026Form.orientations.map((o) => <span key={o} style={{ display: "block" }}>{o}</span>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-page">
      <div className="public-form-container">
        <div className="public-form-header">
          <img src="/brand/little-dates-club-logo-sidebar.png" alt="Little Dates Club" />
          <h1>{summer2026Form.title}</h1>
          <p>Session window: {summer2026Form.sessionWindow} · Deadline: {summer2026Form.deadline}</p>
        </div>

        {summer2026Form.notices.map((notice) => (
          <div className="public-form-notice" key={notice}>
            <AlertTriangle size={16} />
            {notice}
          </div>
        ))}

        <div className="public-form-info">
          <div className="public-form-info-card">
            <strong>{summer2026Form.deadline}</strong>
            <small>Registration deadline</small>
          </div>
          <div className="public-form-info-card">
            <strong>{summer2026Form.donation.suggestedAmount}</strong>
            <small>Suggested donation</small>
          </div>
          <div className="public-form-info-card">
            <strong>Jun 3 – Aug 14</strong>
            <small>Session window</small>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="public-form-errors" ref={firstErrorRef}>
            <strong>Please complete the required fields:</strong>
            <ul>
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {SECTIONS.map((section) => (
            <div className="public-form-section" id={section.id} key={section.id}>
              <div className="public-form-section-head">
                <h2>{section.title}</h2>
                <p>{section.desc}</p>
              </div>
              <div className="public-form-fields">
                {section.id === "identity" && (
                  <div className="public-form-field">
                    <label>Profile photo <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                      {photo ? (
                        <img
                          src={photo.preview}
                          alt="Preview"
                          style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover", border: "1px solid var(--line)", flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: 72, height: 72, borderRadius: 10, border: "2px dashed var(--line)", display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 11, flexShrink: 0 }}>
                          No photo
                        </div>
                      )}
                      <div>
                        <input
                          accept="image/*"
                          id="photo-upload"
                          style={{ display: "none" }}
                          type="file"
                          onChange={handlePhoto}
                        />
                        <label htmlFor="photo-upload" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 13, background: "#fff" }}>
                          {photo ? "Change photo" : "Upload photo"}
                        </label>
                        {photo && (
                          <button onClick={() => { URL.revokeObjectURL(photo.preview); setPhoto(null); }} style={{ marginLeft: 8, fontSize: 12, minHeight: "auto", padding: "6px 10px" }} type="button">
                            Remove
                          </button>
                        )}
                        <p style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>JPG or PNG, used for organizer records only.</p>
                      </div>
                    </div>
                  </div>
                )}
                {section.keys.map((key) => {
                  const field = fieldMap[key];
                  if (!field) return null;
                  const val = values[key] ?? "";
                  const arrVal = (values[key] as string[]) ?? [];

                  if (field.type === "short_text" || field.type === "email" || field.type === "phone") {
                    return (
                      <div className="public-form-field" data-field={key} key={key}>
                        <label>
                          {field.label}
                          {field.required && <span>*</span>}
                        </label>
                        {field.helpText && <p>{field.helpText}</p>}
                        <input
                          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                          value={val as string}
                          onChange={(e) => setVal(key, e.target.value)}
                        />
                      </div>
                    );
                  }

                  if (field.type === "long_text") {
                    return (
                      <div className="public-form-field" data-field={key} key={key}>
                        <label>
                          {field.label}
                          {field.required && <span>*</span>}
                        </label>
                        {field.helpText && <p>{field.helpText}</p>}
                        <textarea rows={3} value={val as string} onChange={(e) => setVal(key, e.target.value)} />
                      </div>
                    );
                  }

                  if (field.type === "dropdown") {
                    return (
                      <div className="public-form-field" data-field={key} key={key}>
                        <label>
                          {field.label}
                          {field.required && <span>*</span>}
                        </label>
                        {field.helpText && <p>{field.helpText}</p>}
                        <select value={val as string} onChange={(e) => setVal(key, e.target.value)}>
                          <option value="">Select</option>
                          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === "radio") {
                    return (
                      <div className="public-form-field" data-field={key} key={key}>
                        <label>
                          {field.label}
                          {field.required && <span>*</span>}
                        </label>
                        {field.helpText && <p>{field.helpText}</p>}
                        <div className="option-grid">
                          {field.options?.map((o) => (
                            <label className="choice-pill" key={o} style={{ fontWeight: val === o ? 800 : 700, borderColor: val === o ? "var(--ldc-blue)" : undefined, background: val === o ? "#eef3f8" : undefined }}>
                              <input type="radio" name={key} value={o} checked={val === o} onChange={() => setVal(key, o)} />
                              <span>{o}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (field.type === "checkboxes") {
                    const isDense = (field.options?.length ?? 0) > 8;
                    return (
                      <div className="public-form-field" data-field={key} key={key}>
                        <label>
                          {field.label}
                          {field.required && <span>*</span>}
                        </label>
                        {field.helpText && <p>{field.helpText}</p>}
                        <div className={isDense ? "option-grid dense" : "option-grid"}>
                          {field.options?.map((o) => (
                            <label className="choice-pill" key={o} style={{ borderColor: arrVal.includes(o) ? "var(--ldc-blue)" : undefined, background: arrVal.includes(o) ? "#eef3f8" : undefined }}>
                              <input type="checkbox" checked={arrVal.includes(o)} onChange={() => toggleOption(key, o)} />
                              <span>{o}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (field.type === "statement_checkbox") {
                    return (
                      <div className="public-ack" key={key}>
                        <label>
                          <input
                            type="checkbox"
                            checked={arrVal.includes("Yes")}
                            onChange={() => toggleOption(key, "Yes")}
                          />
                          <span>{field.label}</span>
                        </label>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ))}

          <div className="public-form-submit">
            <button className="primary" type="submit">Submit Sign-Up</button>
          </div>
        </form>

        <div style={{ marginTop: 24, borderTop: "1px solid var(--line)", paddingTop: 16, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
          Organizer contact: {summer2026Form.donation.zelle}
        </div>
      </div>
    </div>
  );
}
