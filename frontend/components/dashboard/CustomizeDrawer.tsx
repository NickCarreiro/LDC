"use client";

import { Eye, EyeOff, RotateCcw, X } from "lucide-react";

import { DEFAULT_LAYOUT, WIDGET_META, type WidgetConfig } from "../../lib/widgetLayout";

interface Props {
  layout: WidgetConfig[];
  onUpdate: (layout: WidgetConfig[]) => void;
  onReset: () => void;
  onClose: () => void;
}

export function CustomizeDrawer({ layout, onUpdate, onReset, onClose }: Props) {
  function toggle(id: WidgetConfig["id"]) {
    onUpdate(layout.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)));
  }

  const enabled = layout.filter((w) => w.enabled);
  const disabled = layout.filter((w) => !w.enabled);

  return (
    <>
      {/* Backdrop */}
      <div className="customize-backdrop" onClick={onClose} />

      {/* Drawer */}
      <aside className="customize-drawer">
        <div className="customize-drawer-header">
          <div>
            <p className="eyebrow" style={{ marginBottom: 2 }}>Dashboard</p>
            <h2 style={{ fontSize: 18, margin: 0 }}>Customize Widgets</h2>
          </div>
          <button className="widget-action-btn" title="Close" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px" }}>
          Toggle widgets on or off. In edit mode, drag to reorder and use the resize button on each widget.
        </p>

        {enabled.length > 0 && (
          <section className="customize-section">
            <p className="customize-section-label">Visible</p>
            {enabled.map((w) => {
              const meta = WIDGET_META[w.id];
              return (
                <div className="customize-row" key={w.id}>
                  <div>
                    <strong>{meta.label}</strong>
                    <small style={{ display: "block", color: "var(--muted)", marginTop: 2 }}>
                      {meta.description}
                    </small>
                  </div>
                  <button
                    className="widget-action-btn"
                    title="Hide widget"
                    type="button"
                    onClick={() => toggle(w.id)}
                  >
                    <Eye size={16} />
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {disabled.length > 0 && (
          <section className="customize-section">
            <p className="customize-section-label">Hidden</p>
            {disabled.map((w) => {
              const meta = WIDGET_META[w.id];
              return (
                <div className="customize-row customize-row--hidden" key={w.id}>
                  <div>
                    <strong>{meta.label}</strong>
                    <small style={{ display: "block", color: "var(--muted)", marginTop: 2 }}>
                      {meta.description}
                    </small>
                  </div>
                  <button
                    className="widget-action-btn"
                    title="Show widget"
                    type="button"
                    onClick={() => toggle(w.id)}
                  >
                    <EyeOff size={16} />
                  </button>
                </div>
              );
            })}
          </section>
        )}

        <div className="customize-footer">
          <button
            style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--muted)", fontSize: 13 }}
            type="button"
            onClick={onReset}
          >
            <RotateCcw size={14} />
            Reset to defaults
          </button>
        </div>
      </aside>
    </>
  );
}
