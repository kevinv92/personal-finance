const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Types matching API schemas ---

export interface Bank {
  id: string;
  name: string;
  createdAt: string;
}

export interface Account {
  id: string;
  bankId: string;
  name: string;
  accountNumber: string | null;
  type: "checking" | "savings" | "credit";
  currency: string;
  csvSignature: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  externalId: string | null;
  date: string;
  dateProcessed: string | null;
  type: string | null;
  payee: string;
  memo: string | null;
  amount: number;
  categoryName: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export interface CategoryRule {
  id: string;
  categoryId: string;
  matchField: "payee" | "memo" | "both";
  matchType: "contains" | "exact" | "startsWith";
  matchValues: string[];
  sortOrder: number;
  createdAt: string;
}

export type FilterCondition =
  | {
      field: "date";
      operator: "relative";
      value:
        | "last7days"
        | "last30days"
        | "lastMonth"
        | "thisMonth"
        | "lastQuarter"
        | "thisQuarter"
        | "lastYear"
        | "thisYear";
    }
  | { field: "date"; operator: "between"; value: { from: string; to: string } }
  | {
      field: "payee" | "memo";
      operator: "contains" | "equals" | "startsWith";
      value: string[];
    }
  | {
      field: "categoryName" | "accountName";
      operator: "equals" | "in";
      value: string | string[];
    }
  | {
      field: "amount";
      operator: "gt" | "lt" | "between";
      value: number | { min: number; max: number };
    };

export interface SavedFilter {
  id: string;
  name: string;
  conditions: FilterCondition[];
  createdAt: string;
}

// --- API functions ---

export const getBanks = () => apiFetch<Bank[]>("/banks");
export const getAccounts = (bankId?: string) =>
  apiFetch<Account[]>(`/accounts${bankId ? `?bankId=${bankId}` : ""}`);
export const getTransactions = (accountId?: string) =>
  apiFetch<Transaction[]>(
    `/transactions${accountId ? `?accountId=${accountId}` : ""}`,
  );
export const getCategories = () => apiFetch<Category[]>("/categories");
export const getCategoryRules = () =>
  apiFetch<CategoryRule[]>("/category-rules");
export const createCategoryRule = (
  rule: Omit<CategoryRule, "id" | "sortOrder" | "createdAt">,
) =>
  apiFetch<CategoryRule>("/category-rules", {
    method: "POST",
    body: JSON.stringify(rule),
  });
export const deleteCategoryRule = (id: string) =>
  apiFetch<void>(`/category-rules/${id}`, { method: "DELETE" });
export const applyCategoryRules = (mode: "uncategorised" | "all") =>
  apiFetch<{ categorised: number; total: number }>(
    `/category-rules/apply?mode=${mode}`,
    { method: "POST", body: JSON.stringify({}) },
  );
export const getSavedFilters = () => apiFetch<SavedFilter[]>("/saved-filters");
export const createSavedFilter = (
  filter: Omit<SavedFilter, "id" | "createdAt">,
) =>
  apiFetch<SavedFilter>("/saved-filters", {
    method: "POST",
    body: JSON.stringify(filter),
  });
export const deleteSavedFilter = (id: string) =>
  apiFetch<void>(`/saved-filters/${id}`, { method: "DELETE" });
