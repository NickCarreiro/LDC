"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Maximize2, Minimize2, X } from "lucide-react";
import type { ReactNode } from "react";

import { WIDGET_META, type WidgetConfig } from "../../lib/widgetLayout";

interface Props {
  config: WidgetConfig;
  editMode: boolean;
  onResize: (id: WidgetConfig["id"], size: 1 | 2) => void;
  onRemove: (id: WidgetConfig["id"]) => void;
  children: ReactNode;
}

export function WidgetFrame({ config, editMode, onResize, onRemove, children }: Props) {
  const { id, size } = config;
  const meta = WIDGET_META[id];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editMode });

  const style: React.CSSProperties = {
    gridColumn: `span ${size}`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`widget-frame panel${editMode ? " widget-frame--edit" : ""}${isDragging ? " widget-frame--dragging" : ""}`}
    >
      {editMode && (
        <div className="widget-frame-toolbar">
          <button
            className="widget-drag-handle"
            title="Drag to reorder"
            type="button"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
          <span className="widget-frame-label">{meta.label}</span>
          <div className="widget-frame-actions">
            {!meta.fixedSize && (
              <button
                className="widget-action-btn"
                title={size === 2 ? "Make half-width" : "Make full-width"}
                type="button"
                onClick={() => onResize(id, size === 2 ? 1 : 2)}
              >
                {size === 2 ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            )}
            <button
              className="widget-action-btn widget-action-btn--remove"
              title="Remove widget"
              type="button"
              onClick={() => onRemove(id)}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      <div className="widget-frame-body">{children}</div>
    </div>
  );
}
