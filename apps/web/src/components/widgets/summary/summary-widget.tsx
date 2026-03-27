"use client";

import type { WidgetData } from "../widget-data";

const formatAmount = (amount: number) => {
  const formatted = Math.abs(amount).toLocaleString("en-NZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
};

type WidgetSize = "compact" | "medium" | "wide";

function getSize(gridW: number): WidgetSize {
  if (gridW <= 2) return "compact";
  if (gridW >= 6) return "wide";
  return "medium";
}

interface SummaryWidgetProps {
  title?: string;
  data: WidgetData;
  config: Record<string, unknown>;
  gridW?: number;
  gridH?: number;
}

export function SummaryWidget({
  title,
  data,
  config,
  gridW = 4,
}: SummaryWidgetProps) {
  const showTransactionCount = (config.showTransactionCount ?? true) as boolean;
  const size = getSize(gridW);

  const titleClass = {
    compact: "text-sm font-semibold",
    medium: "text-base font-bold",
    wide: "text-xl font-bold",
  }[size];

  const labelClass = {
    compact: "text-xs",
    medium: "text-sm",
    wide: "text-base",
  }[size];

  const amountClass = {
    compact: "text-base font-semibold",
    medium: "text-lg font-semibold",
    wide: "text-2xl font-bold",
  }[size];

  const netAmountClass = {
    compact: "text-2xl font-bold",
    medium: "text-lg font-bold",
    wide: "text-2xl font-bold",
  }[size];

  const netColor = data.netAmount >= 0 ? "text-green-600" : "text-red-600";

  if (size === "compact") {
    return (
      <div className="flex flex-col items-center justify-center h-full px-2">
        {title && (
          <span
            className={`${titleClass} text-foreground mb-1 text-center truncate w-full`}
          >
            {title}
          </span>
        )}
        <span className={`${netAmountClass} ${netColor}`}>
          {formatAmount(data.netAmount)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center h-full gap-3 px-4 tabular-nums">
      {title && <h3 className={`${titleClass} text-foreground`}>{title}</h3>}
      <div className="flex justify-between items-center">
        <span className={`${labelClass} text-muted-foreground`}>Income</span>
        <span className={`${amountClass} text-green-600`}>
          {formatAmount(data.totalIncome)}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className={`${labelClass} text-muted-foreground`}>Expenses</span>
        <span className={`${amountClass} text-red-600`}>
          {formatAmount(data.totalExpenses)}
        </span>
      </div>
      <div className="border-t pt-2 flex justify-between items-center">
        <span className={`${labelClass} font-medium`}>Net</span>
        <span className={`${netAmountClass} ${netColor}`}>
          {formatAmount(data.netAmount)}
        </span>
      </div>
      {showTransactionCount && (
        <div className="text-xs text-muted-foreground">
          {data.transactions.length} transactions
        </div>
      )}
    </div>
  );
}
