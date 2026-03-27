"use client";

import { useState } from "react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  type Layout,
  type LayoutItem,
} from "react-grid-layout";
import {
  type WidgetType,
  type WidgetConfig,
  widgetConfigDefaults,
} from "@/lib/api";
import { WidgetConfigForm } from "./widget-config-forms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WidgetStoryLayoutProps {
  children: (gridW: number, gridH: number) => React.ReactNode;
  title?: string;
  filterName?: string;
  widgetType?: WidgetType;
  initialW?: number;
  initialH?: number;
  minW?: number;
  minH?: number;
}

export function WidgetStoryLayout({
  children,
  title: initialTitle = "Widget Title",
  filterName,
  widgetType = "summary",
  initialW = 6,
  initialH = 4,
  minW = 2,
  minH = 2,
}: WidgetStoryLayoutProps) {
  const { containerRef, width } = useContainerWidth();
  const [layout, setLayout] = useState<LayoutItem[]>([
    { i: "widget", x: 0, y: 0, w: initialW, h: initialH, minW, minH },
  ]);
  const [showEdit, setShowEdit] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [config, setConfig] = useState<WidgetConfig>(
    widgetConfigDefaults[widgetType],
  );

  const currentItem = layout[0];

  return (
    <div ref={containerRef} style={{ width: "100%", minHeight: 600 }}>
      <div className="mb-2 text-xs text-muted-foreground">
        Grid size: {currentItem.w} x {currentItem.h} — drag edges to resize
      </div>
      {width > 0 && (
        <ResponsiveGridLayout
          width={width}
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 8, sm: 4, xs: 2 }}
          rowHeight={80}
          onLayoutChange={(newLayout: Layout) => setLayout([...newLayout])}
        >
          <div key="widget">
            <div className="bg-white rounded-lg shadow border h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50 shrink-0">
                <h4 className="text-xs font-medium text-muted-foreground truncate">
                  {title}
                  {filterName && (
                    <span className="ml-1 text-muted-foreground/60">
                      ({filterName})
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    className="text-muted-foreground hover:text-foreground text-xs"
                    title="Edit widget"
                    onClick={() => setShowEdit(true)}
                  >
                    &#9881;
                  </button>
                  <button
                    className="text-muted-foreground hover:text-red-600 text-xs"
                    title="Remove widget"
                    onClick={() => alert("Remove clicked")}
                  >
                    x
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {children(currentItem.w, currentItem.h)}
              </div>
            </div>
          </div>
        </ResponsiveGridLayout>
      )}

      {showEdit && (
        <StoryEditDialog
          title={title}
          widgetType={widgetType}
          filterName={filterName}
          config={config}
          onSave={(newTitle, newConfig) => {
            setTitle(newTitle);
            setConfig(newConfig);
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}

function StoryEditDialog({
  title,
  widgetType,
  filterName,
  config,
  onSave,
  onClose,
}: {
  title: string;
  widgetType: WidgetType;
  filterName?: string;
  config: WidgetConfig;
  onSave: (title: string, config: WidgetConfig) => void;
  onClose: () => void;
}) {
  const [editTitle, setEditTitle] = useState(title);
  const [editConfig, setEditConfig] = useState<WidgetConfig>(config);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Widget Type
            </label>
            <select
              value={widgetType}
              disabled
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm disabled:opacity-50"
            >
              <option value={widgetType}>{widgetType}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Filter</label>
            <select
              value={filterName ?? ""}
              disabled
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm disabled:opacity-50"
            >
              <option value="">{filterName ?? "No filter (all data)"}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Configuration
            </label>
            <div className="rounded-lg border border-input p-3">
              <WidgetConfigForm
                type={widgetType}
                config={editConfig}
                onChange={setEditConfig}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(editTitle, editConfig)}>Save</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
