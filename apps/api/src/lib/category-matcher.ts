import { db } from "../db/index.js";
import { categoryRules } from "../db/schema/index.js";

interface MatchableTransaction {
  payee: string;
  memo: string | null;
}

/**
 * Finds the matching category for a transaction based on category rules.
 * Checks matchValues against payee, memo, or both based on matchField.
 * Rules are ordered by sortOrder — first match wins.
 */
export function matchCategory(
  transaction: MatchableTransaction,
): string | null {
  const rules = db
    .select()
    .from(categoryRules)
    .orderBy(categoryRules.sortOrder)
    .all();

  for (const rule of rules) {
    const checkPayee =
      rule.matchField === "payee" || rule.matchField === "both";
    const checkMemo = rule.matchField === "memo" || rule.matchField === "both";

    const matches = rule.matchValues.some(
      (matchValue) =>
        (checkPayee &&
          fieldMatches(transaction.payee, rule.matchType, matchValue)) ||
        (checkMemo &&
          transaction.memo != null &&
          fieldMatches(transaction.memo, rule.matchType, matchValue)),
    );

    if (matches) {
      return rule.categoryId;
    }
  }

  return null;
}

function fieldMatches(
  value: string,
  matchType: string,
  matchValue: string,
): boolean {
  switch (matchType) {
    case "contains":
      return value.includes(matchValue);
    case "exact":
      return value === matchValue;
    case "startsWith":
      return value.startsWith(matchValue);
    default:
      return false;
  }
}
