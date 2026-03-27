"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTransactions,
  getSavedFilters,
  type DashboardWidget,
  type WidgetType,
} from "@/lib/api";
import { computeWidgetData } from "./widget-data";
import { SummaryWidget } from "./summary/summary-widget";
import { CategoryBreakdownWidget } from "./category-breakdown/category-breakdown-widget";

interface GridConstraints {
  minW: number;
  minH: number;
}

export const widgetConstraints: Record<WidgetType, GridConstraints> = {
  summary: { minW: 1, minH: 1 },
  categoryBreakdown: { minW: 3, minH: 3 },
  trend: { minW: 4, minH: 3 },
  transactionList: { minW: 6, minH: 4 },
};

interface WidgetContainerProps {
  widget: DashboardWidget;
  onRemove: (id: string) => void;
  onEdit?: () => void;
}

export function WidgetContainer({
  widget,
  onRemove,
  onEdit,
}: WidgetContainerProps) {
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
  });

  const { data: savedFilters = [] } = useQuery({
    queryKey: ["savedFilters"],
    queryFn: getSavedFilters,
  });

  const filter = savedFilters.find((f) => f.id === widget.filterId);
  const conditions = filter?.conditions ?? [];

  const widgetData = useMemo(
    () => computeWidgetData(transactions, conditions),
    [transactions, conditions],
  );

  return (
    <div className="bg-white rounded-lg shadow border h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50 shrink-0">
        <h4 className="text-xs font-medium text-muted-foreground truncate">
          {widget.title}
          {filter && (
            <span className="ml-1 text-muted-foreground/60">
              ({filter.name})
            </span>
          )}
        </h4>
        <div className="flex items-center gap-1 ml-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground text-xs"
              title="Edit widget"
            >
              &#9881;
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(widget.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-red-600 text-xs"
            title="Remove widget"
          >
            x
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <WidgetRenderer
          type={widget.type}
          title={widget.title}
          data={widgetData}
          config={widget.config}
          gridW={widget.w}
          gridH={widget.h}
        />
      </div>
    </div>
  );
}

function WidgetRenderer({
  type,
  title,
  data,
  config,
  gridW,
  gridH,
}: {
  type: WidgetType;
  title: string;
  data: ReturnType<typeof computeWidgetData>;
  config: Record<string, unknown>;
  gridW: number;
  gridH: number;
}) {
  switch (type) {
    case "summary":
      return (
        <SummaryWidget
          title={title}
          data={data}
          config={config}
          gridW={gridW}
          gridH={gridH}
        />
      );
    case "categoryBreakdown":
      return <CategoryBreakdownWidget data={data} config={config} />;
    case "trend":
      return (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          Trend widget coming soon
        </div>
      );
    case "transactionList":
      return (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          Transaction list widget coming soon
        </div>
      );
  }
}
