import type { Transaction, FilterCondition } from "@/lib/api";
import { createFilterFn } from "@/lib/filter-engine";

export interface WidgetData {
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  categoryTotals: { name: string; value: number }[];
}

export function computeWidgetData(
  transactions: Transaction[],
  conditions: FilterCondition[],
): WidgetData {
  const filtered =
    conditions.length > 0
      ? transactions.filter((txn) => {
          const row = { ...txn, bankName: "", accountName: "" };
          return createFilterFn(conditions)(row);
        })
      : transactions;

  const totalIncome = filtered
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filtered
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const netAmount = totalIncome + totalExpenses;

  const categoryMap = new Map<string, number>();
  for (const txn of filtered) {
    const cat = txn.categoryName ?? "Uncategorised";
    if (txn.amount < 0) {
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Math.abs(txn.amount));
    }
  }

  const categoryTotals = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  return {
    transactions: filtered,
    totalIncome,
    totalExpenses,
    netAmount,
    categoryTotals,
  };
}
