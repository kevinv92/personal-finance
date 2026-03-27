"use client";

import type {
  WidgetType,
  WidgetConfig,
  SummaryConfig,
  CategoryBreakdownConfig,
  TrendConfig,
  TransactionListConfig,
} from "@/lib/api";

interface ConfigFormProps {
  config: WidgetConfig;
  onChange: (config: WidgetConfig) => void;
}

export function WidgetConfigForm({
  type,
  config,
  onChange,
}: {
  type: WidgetType;
  config: WidgetConfig;
  onChange: (config: WidgetConfig) => void;
}) {
  switch (type) {
    case "summary":
      return (
        <SummaryConfigForm
          config={config as SummaryConfig}
          onChange={onChange}
        />
      );
    case "categoryBreakdown":
      return (
        <CategoryBreakdownConfigForm
          config={config as CategoryBreakdownConfig}
          onChange={onChange}
        />
      );
    case "trend":
      return (
        <TrendConfigForm config={config as TrendConfig} onChange={onChange} />
      );
    case "transactionList":
      return (
        <TransactionListConfigForm
          config={config as TransactionListConfig}
          onChange={onChange}
        />
      );
  }
}

function SummaryConfigForm({ config, onChange }: ConfigFormProps) {
  const c = config as SummaryConfig;
  return (
    <div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={c.showTransactionCount}
          onChange={(e) =>
            onChange({ ...c, showTransactionCount: e.target.checked })
          }
        />
        Show transaction count
      </label>
      <p className="text-xs text-muted-foreground mt-1 ml-5">
        Display the number of transactions below the totals
      </p>
    </div>
  );
}

function CategoryBreakdownConfigForm({ config, onChange }: ConfigFormProps) {
  const c = config as CategoryBreakdownConfig;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Max categories</label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Limit the number of categories shown in the chart (1-20)
        </p>
        <input
          type="number"
          min={1}
          max={20}
          value={c.maxCategories}
          onChange={(e) =>
            onChange({ ...c, maxCategories: parseInt(e.target.value) || 10 })
          }
          className="h-9 w-20 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
        />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={c.showTable}
            onChange={(e) => onChange({ ...c, showTable: e.target.checked })}
          />
          Show breakdown table
        </label>
        <p className="text-xs text-muted-foreground mt-1 ml-5">
          Display a table with category amounts below the chart
        </p>
      </div>
    </div>
  );
}

function TrendConfigForm({ config, onChange }: ConfigFormProps) {
  const c = config as TrendConfig;
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Group by</label>
        <p className="text-xs text-muted-foreground mb-1.5">
          How to aggregate transaction amounts over time
        </p>
        <select
          value={c.groupBy}
          onChange={(e) =>
            onChange({
              ...c,
              groupBy: e.target.value as TrendConfig["groupBy"],
            })
          }
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Chart type</label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Visual style for the trend chart
        </p>
        <select
          value={c.chartType}
          onChange={(e) =>
            onChange({
              ...c,
              chartType: e.target.value as TrendConfig["chartType"],
            })
          }
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="bar">Bar</option>
          <option value="line">Line</option>
        </select>
      </div>
    </div>
  );
}

function TransactionListConfigForm({ config, onChange }: ConfigFormProps) {
  const c = config as TransactionListConfig;
  return (
    <div>
      <label className="block text-sm font-medium mb-1">Page size</label>
      <p className="text-xs text-muted-foreground mb-1.5">
        Number of transactions to show per page (5-100)
      </p>
      <input
        type="number"
        min={5}
        max={100}
        value={c.pageSize}
        onChange={(e) =>
          onChange({ ...c, pageSize: parseInt(e.target.value) || 10 })
        }
        className="h-9 w-20 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
      />
    </div>
  );
}
