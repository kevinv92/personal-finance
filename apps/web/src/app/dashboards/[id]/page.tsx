"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GridLayout, type Layout, type LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import {
  getDashboards,
  renameDashboard,
  getDashboardWidgets,
  addDashboardWidget,
  updateDashboardWidget,
  updateWidgetLayouts,
  removeDashboardWidget,
  getSavedFilters,
  widgetConfigDefaults,
  type DashboardWidget,
  type WidgetType,
  type WidgetConfig,
} from "@/lib/api";
import { WidgetConfigForm } from "@/components/widgets/widget-config-forms";
import {
  WidgetContainer,
  widgetConstraints,
} from "@/components/widgets/widget-container";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const GRID_COLS = 12;
const GRID_WIDTH = 1200;

const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  summary: "Summary",
  categoryBreakdown: "Category Breakdown",
  trend: "Trend",
  transactionList: "Transaction List",
};

export default function DashboardViewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dashboardId = params.id as string;

  const [dialogMode, setDialogMode] = useState<
    { mode: "add" } | { mode: "edit"; widget: DashboardWidget } | null
  >(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const { data: dashboardList = [] } = useQuery({
    queryKey: ["dashboards"],
    queryFn: getDashboards,
  });

  const dashboard = dashboardList.find((d) => d.id === dashboardId);

  const { data: widgets = [] } = useQuery({
    queryKey: ["dashboardWidgets", dashboardId],
    queryFn: () => getDashboardWidgets(dashboardId),
    enabled: !!dashboardId,
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameDashboard(dashboardId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setIsRenaming(false);
    },
  });

  const layoutSaveMutation = useMutation({
    mutationFn: (
      layouts: { id: string; x: number; y: number; w: number; h: number }[],
    ) => updateWidgetLayouts(dashboardId, layouts),
  });

  const removeWidgetMutation = useMutation({
    mutationFn: (widgetId: string) =>
      removeDashboardWidget(dashboardId, widgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboardWidgets", dashboardId],
      });
    },
  });

  const handleLayoutChange = useCallback(
    (...args: unknown[]) => {
      const layout = (Array.isArray(args[0]) ? args[0] : args) as Layout;
      if (widgets.length === 0) return;

      const updates = layout
        .filter((item) => widgets.some((w) => w.id === item.i))
        .map((item) => ({
          id: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        }));

      if (updates.length > 0) {
        layoutSaveMutation.mutate(updates);
        queryClient.setQueryData(
          ["dashboardWidgets", dashboardId],
          widgets.map((w) => {
            const updated = updates.find((u) => u.id === w.id);
            return updated ? { ...w, ...updated } : w;
          }),
        );
      }
    },
    [dashboardId, widgets, layoutSaveMutation, queryClient],
  );

  const gridLayout: LayoutItem[] = widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    ...widgetConstraints[w.type],
  }));

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Dashboard not found.</p>
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mt-4"
        >
          Back to Dashboards
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isRenaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (renameValue.trim()) {
                  renameMutation.mutate(renameValue.trim());
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-lg font-bold outline-none"
                autoFocus
              />
              <Button
                type="submit"
                size="sm"
                disabled={renameMutation.isPending}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsRenaming(false)}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <h2
              className="text-2xl font-bold cursor-pointer hover:text-muted-foreground transition-colors"
              onClick={() => {
                setRenameValue(dashboard.name);
                setIsRenaming(true);
              }}
              title="Click to rename"
            >
              {dashboard.name}
            </h2>
          )}
        </div>
        <Button onClick={() => setDialogMode({ mode: "add" })}>
          Add Widget
        </Button>
      </div>

      {widgets.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          No widgets yet. Click &quot;Add Widget&quot; to get started.
        </p>
      )}

      {widgets.length > 0 && (
        <div className="flex justify-center overflow-x-auto">
          <div
            className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 p-3"
            style={{ width: GRID_WIDTH + 24 }}
          >
            <GridLayout
              width={GRID_WIDTH}
              className="layout"
              layout={gridLayout}
              gridConfig={{ cols: GRID_COLS, rowHeight: 80 }}
              onDragStop={(layout) => handleLayoutChange(layout)}
              onResizeStop={(layout) => handleLayoutChange(layout)}
            >
              {widgets.map((widget) => (
                <div key={widget.id}>
                  <WidgetContainer
                    widget={widget}
                    onRemove={(id) => removeWidgetMutation.mutate(id)}
                    onEdit={() => setDialogMode({ mode: "edit", widget })}
                  />
                </div>
              ))}
            </GridLayout>
          </div>
        </div>
      )}

      {dialogMode && (
        <WidgetDialog
          dashboardId={dashboardId}
          mode={dialogMode}
          widgets={widgets}
          onClose={() => setDialogMode(null)}
        />
      )}
    </div>
  );
}

function WidgetDialog({
  dashboardId,
  mode,
  widgets = [],
  onClose,
}: {
  dashboardId: string;
  mode: { mode: "add" } | { mode: "edit"; widget: DashboardWidget };
  widgets?: DashboardWidget[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = mode.mode === "edit";
  const existing = isEdit ? mode.widget : null;

  const [type, setType] = useState<WidgetType>(existing?.type ?? "summary");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [filterId, setFilterId] = useState(existing?.filterId ?? "");
  const [config, setConfig] = useState<WidgetConfig>(
    existing?.config
      ? (existing.config as unknown as WidgetConfig)
      : widgetConfigDefaults[existing?.type ?? "summary"],
  );

  const { data: savedFilters = [] } = useQuery({
    queryKey: ["savedFilters"],
    queryFn: getSavedFilters,
  });

  const addMutation = useMutation({
    mutationFn: (widget: Parameters<typeof addDashboardWidget>[1]) =>
      addDashboardWidget(dashboardId, widget),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboardWidgets", dashboardId],
      });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      type?: WidgetType;
      title?: string;
      filterId?: string | null;
      config?: Record<string, unknown>;
    }) => updateDashboardWidget(dashboardId, existing!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dashboardWidgets", dashboardId],
      });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const widgetTitle = title || WIDGET_TYPE_LABELS[type];

    if (isEdit) {
      updateMutation.mutate({
        type,
        title: widgetTitle,
        filterId: filterId || null,
        config: config as unknown as Record<string, unknown>,
      });
    } else {
      const constraints = widgetConstraints[type];
      const nextY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
      addMutation.mutate({
        type,
        title: widgetTitle,
        filterId: filterId || null,
        x: 0,
        y: nextY,
        w: constraints.minW + 2,
        h: constraints.minH + 1,
        config: config as unknown as Record<string, unknown>,
      });
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Widget" : "Add Widget"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Widget Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as WidgetType;
                setType(newType);
                setConfig(widgetConfigDefaults[newType]);
              }}
              disabled={isEdit}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm disabled:opacity-50"
            >
              {Object.entries(WIDGET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={WIDGET_TYPE_LABELS[type]}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Filter (optional)
            </label>
            <select
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">No filter (all data)</option>
              {savedFilters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Configuration
            </label>
            <div className="rounded-lg border border-input p-3">
              <WidgetConfigForm
                type={type}
                config={config}
                onChange={setConfig}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
