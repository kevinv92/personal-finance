import type { FilterCondition } from "@/lib/api";

/** Encode filter conditions to a URL-safe base64 string */
export function encodeFilters(conditions: FilterCondition[]): string | null {
  if (conditions.length === 0) return null;
  return btoa(JSON.stringify(conditions));
}

/** Decode filter conditions from a URL base64 string */
export function decodeFilters(param: string | null): FilterCondition[] {
  if (!param) return [];
  try {
    const parsed = JSON.parse(atob(param));
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

/** Build a /transactions URL with the given filter conditions pre-applied */
export function buildTransactionsUrl(conditions: FilterCondition[]): string {
  const encoded = encodeFilters(conditions);
  if (!encoded) return "/transactions";
  return `/transactions?filters=${encoded}`;
}
