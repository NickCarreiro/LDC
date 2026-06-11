"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { LayoutGrid, Pencil, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DEFAULT_LAYOUT,
  loadLayout,
  resetLayout,
  saveLayout,
  type WidgetConfig,
} from "../../lib/widgetLayout";
import { CustomizeDrawer } from "./CustomizeDrawer";
import { WidgetFrame } from "./WidgetFrame";
import { WIDGET_COMPONENTS } from "../widgets/index";

export function WidgetGrid() {
  const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load persisted layout client-side to avoid SSR mismatch
  useEffect(() => {
    setLayout(loadLayout());
    setMounted(true);
  }, []);

  function updateLayout(next: WidgetConfig[]) {
    setLayout(next);
    saveLayout(next);
  }

  function handleResize(id: WidgetConfig["id"], size: 1 | 2) {
    updateLayout(layout.map((w) => (w.id === id ? { ...w, size } : w)));
  }

  function handleRemove(id: WidgetConfig["id"]) {
    updateLayout(layout.map((w) => (w.id === id ? { ...w, enabled: false } : w)));
  }

  function handleReset() {
    setLayout(resetLayout());
    setDrawerOpen(false);
    setEditMode(false);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const enabledLayout = layout.filter((w) => w.enabled);
    const oldIndex = enabledLayout.findIndex((w) => w.id === active.id);
    const newIndex = enabledLayout.findIndex((w) => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(enabledLayout, oldIndex, newIndex);
    // Merge disabled widgets back (they keep their original relative order at the end)
    const disabled = layout.filter((w) => !w.enabled);
    updateLayout([...reordered, ...disabled]);
  }

  const enabledWidgets = layout.filter((w) => w.enabled && w.id !== "session-header");
  const sortableIds = enabledWidgets.map((w) => w.id);

  const activeWidget = activeId ? enabledWidgets.find((w) => w.id === activeId) : null;
  const ActiveComponent = activeWidget ? WIDGET_COMPONENTS[activeWidget.id] : null;

  if (!mounted) return null;

  return (
    <>
      {/* Edit mode / Customize controls */}
      <div className="widget-grid-controls">
        <button
          className={editMode ? "primary" : ""}
          title={editMode ? "Exit edit mode" : "Enter edit mode to drag and resize widgets"}
          type="button"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? (
            <>
              <LayoutGrid size={16} />
              Done
            </>
          ) : (
            <>
              <Pencil size={16} />
              Edit Layout
            </>
          )}
        </button>
        <button
          type="button"
          title="Customize which widgets are visible"
          onClick={() => setDrawerOpen(true)}
        >
          <Settings2 size={16} />
          Customize
        </button>
      </div>

      {editMode && (
        <div className="widget-edit-banner">
          Drag widgets to reorder · Use <strong>⇔</strong> to resize · <strong>✕</strong> to hide · Click <strong>Done</strong> when finished
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="widget-grid">
            {enabledWidgets.map((config) => {
              const Component = WIDGET_COMPONENTS[config.id];
              if (!Component) return null;
              return (
                <WidgetFrame
                  key={config.id}
                  config={config}
                  editMode={editMode}
                  onResize={handleResize}
                  onRemove={handleRemove}
                >
                  {Component()}
                </WidgetFrame>
              );
            })}
          </div>
        </SortableContext>

        {/* Drag overlay — ghost of the widget being dragged */}
        <DragOverlay>
          {ActiveComponent && activeWidget ? (
            <div
              className="widget-frame panel widget-frame--ghost"
              style={{ gridColumn: `span ${activeWidget.size}` }}
            >
              <div className="widget-frame-body">{ActiveComponent()}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {drawerOpen && (
        <CustomizeDrawer
          layout={layout}
          onUpdate={updateLayout}
          onReset={handleReset}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
