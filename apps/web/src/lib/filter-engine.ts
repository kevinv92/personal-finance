import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  subYears,
  format,
} from "date-fns";
import type { FilterCondition } from "./api";

interface FilterableRow {
  date: string;
  payee: string;
  memo: string | null;
  categoryName: string | null;
  bankName: string;
  accountName: string;
  amount: number;
}

/**
 * Resolves a relative date preset to an absolute { from, to } range.
 */
export function resolveRelativeDate(
  value: FilterCondition & { field: "date"; operator: "relative" },
): { from: string; to: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  switch (value.value) {
    case "last7days":
      return { from: fmt(subDays(today, 7)), to: fmt(today) };
    case "last30days":
      return { from: fmt(subDays(today, 30)), to: fmt(today) };
    case "lastMonth": {
      const last = subMonths(today, 1);
      return { from: fmt(startOfMonth(last)), to: fmt(endOfMonth(last)) };
    }
    case "thisMonth":
      return { from: fmt(startOfMonth(today)), to: fmt(today) };
    case "lastQuarter": {
      const last = subQuarters(today, 1);
      return { from: fmt(startOfQuarter(last)), to: fmt(endOfQuarter(last)) };
    }
    case "thisQuarter":
      return { from: fmt(startOfQuarter(today)), to: fmt(today) };
    case "lastYear": {
      const last = subYears(today, 1);
      return { from: fmt(startOfYear(last)), to: fmt(endOfYear(last)) };
    }
    case "thisYear":
      return { from: fmt(startOfYear(today)), to: fmt(today) };
  }
}

function textMatches(
  value: string | null,
  operator: "contains" | "equals" | "startsWith" | "notContains" | "notEquals",
  matchValues: string[],
): boolean {
  if (value == null) return false;
  switch (operator) {
    case "contains":
      return matchValues.some((mv) => value.includes(mv));
    case "notContains":
      return matchValues.every((mv) => !value.includes(mv));
    case "equals":
      return matchValues.some((mv) => value === mv);
    case "notEquals":
      return matchValues.every((mv) => value !== mv);
    case "startsWith":
      return matchValues.some((mv) => value.startsWith(mv));
  }
}

function matchesCondition(
  row: FilterableRow,
  condition: FilterCondition,
): boolean {
  switch (condition.field) {
    case "date": {
      const range =
        condition.operator === "relative"
          ? resolveRelativeDate(
              condition as FilterCondition & {
                field: "date";
                operator: "relative";
              },
            )
          : (condition.value as { from: string; to: string });
      return row.date >= range.from && row.date <= range.to;
    }
    case "payee":
      return textMatches(row.payee, condition.operator, condition.value);
    case "memo":
      return textMatches(row.memo, condition.operator, condition.value);
    case "categoryName": {
      const values = Array.isArray(condition.value)
        ? condition.value
        : [condition.value];
      if (
        condition.operator === "notEquals" ||
        condition.operator === "notIn"
      ) {
        return row.categoryName == null || !values.includes(row.categoryName);
      }
      return row.categoryName != null && values.includes(row.categoryName);
    }
    case "bankName": {
      const values = Array.isArray(condition.value)
        ? condition.value
        : [condition.value];
      if (
        condition.operator === "notEquals" ||
        condition.operator === "notIn"
      ) {
        return !values.includes(row.bankName);
      }
      return values.includes(row.bankName);
    }
    case "accountName": {
      const values = Array.isArray(condition.value)
        ? condition.value
        : [condition.value];
      if (
        condition.operator === "notEquals" ||
        condition.operator === "notIn"
      ) {
        return !values.includes(row.accountName);
      }
      return values.includes(row.accountName);
    }
    case "amount": {
      if (condition.operator === "between") {
        const range = condition.value as { min: number; max: number };
        return row.amount >= range.min && row.amount <= range.max;
      }
      const num = condition.value as number;
      return condition.operator === "gt" ? row.amount > num : row.amount < num;
    }
  }
}

/**
 * Creates a filter function from an array of conditions (AND'd together).
 */
export function createFilterFn(conditions: FilterCondition[]) {
  return (row: FilterableRow): boolean =>
    conditions.every((condition) => matchesCondition(row, condition));
}
