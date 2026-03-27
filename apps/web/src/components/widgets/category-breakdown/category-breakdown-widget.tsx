"use client";

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WidgetData } from "../widget-data";

interface CategoryBreakdownWidgetProps {
  data: WidgetData;
  config: Record<string, unknown>;
}

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#e11d48",
  "#65a30d",
  "#c026d3",
  "#ea580c",
];

const formatAmount = (value: number) =>
  `$${value.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CategoryBreakdownWidget({
  data,
  config,
}: CategoryBreakdownWidgetProps) {
  const maxCategories = (config.maxCategories ?? 10) as number;
  const showTable = (config.showTable ?? false) as boolean;
  const { categoryTotals } = data;

  if (categoryTotals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No expense data
      </div>
    );
  }

  const sliced = categoryTotals.slice(0, maxCategories);

  return (
    <div className="h-full flex flex-col">
      <div className={showTable ? "flex-1 min-h-0" : "h-full"}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sliced}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
            >
              {sliced.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatAmount(Number(value))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {showTable && (
        <div className="px-3 pb-2 max-h-[140px] overflow-y-auto border-t">
          <table className="w-full text-xs">
            <tbody>
              {sliced.map((cat, i) => (
                <tr key={cat.name}>
                  <td className="py-0.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block shrink-0"
                        style={{
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                      {cat.name}
                    </span>
                  </td>
                  <td className="text-right font-medium py-0.5">
                    {formatAmount(cat.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
