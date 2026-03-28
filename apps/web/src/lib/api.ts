const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
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
  recurringId: string | null;
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
      operator:
        | "contains"
        | "equals"
        | "startsWith"
        | "notContains"
        | "notEquals";
      value: string[];
    }
  | {
      field: "categoryName" | "bankName" | "accountName";
      operator: "equals" | "in" | "notEquals" | "notIn";
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

export type WidgetType =
  | "summary"
  | "categoryBreakdown"
  | "trend"
  | "transactionList";

export interface Dashboard {
  id: string;
  name: string;
  createdAt: string;
}

export interface SummaryConfig {
  type: "summary";
  showTransactionCount: boolean;
}

export interface CategoryBreakdownConfig {
  type: "categoryBreakdown";
  maxCategories: number;
  showTable: boolean;
}

export interface TrendConfig {
  type: "trend";
  groupBy: "day" | "week" | "month";
  chartType: "line" | "bar";
}

export interface TransactionListConfig {
  type: "transactionList";
  pageSize: number;
}

export type WidgetConfig =
  | SummaryConfig
  | CategoryBreakdownConfig
  | TrendConfig
  | TransactionListConfig;

export const widgetConfigDefaults: Record<WidgetType, WidgetConfig> = {
  summary: { type: "summary", showTransactionCount: true },
  categoryBreakdown: {
    type: "categoryBreakdown",
    maxCategories: 10,
    showTable: false,
  },
  trend: { type: "trend", groupBy: "month", chartType: "bar" },
  transactionList: { type: "transactionList", pageSize: 10 },
};

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  type: WidgetType;
  title: string;
  filterId: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface CSVMapperPreset {
  key: string;
  name: string;
  bank: string;
  accountType: "checking" | "savings" | "credit";
  csvSignature: string;
}

export type TransactionField =
  | "date"
  | "dateProcessed"
  | "externalId"
  | "type"
  | "payee"
  | "memo"
  | "amount";

export interface CsvMapper {
  id: string;
  name: string;
  bank: string;
  accountType: "checking" | "savings" | "credit";
  csvSignature: string;
  metaLineStart: number;
  metaLineEnd: number;
  headerRow: number;
  dataStartRow: number;
  accountMetaLine: number;
  delimiter: string | null;
  columnMap: Record<string, TransactionField>;
  dateFormat: string | null;
  invertAmount: boolean;
  createdAt: string;
}

export interface ImportResult {
  preset: string;
  bank: string;
  accountSignature: string;
  imported: number;
  skipped: number;
  categorised: number;
  total: number;
}

export type Frequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "annual";

export interface Recurring {
  id: string;
  name: string;
  matchKey: string | null;
  expectedAmount: number | null;
  frequency: Frequency;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
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
export const getDashboards = () => apiFetch<Dashboard[]>("/dashboards");
export const createDashboard = (data: { name: string }) =>
  apiFetch<Dashboard>("/dashboards", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const renameDashboard = (id: string, name: string) =>
  apiFetch<Dashboard>(`/dashboards/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
export const deleteDashboard = (id: string) =>
  apiFetch<void>(`/dashboards/${id}`, { method: "DELETE" });
export const getDashboardWidgets = (dashboardId: string) =>
  apiFetch<DashboardWidget[]>(`/dashboards/${dashboardId}/widgets`);
export const addDashboardWidget = (
  dashboardId: string,
  widget: Omit<DashboardWidget, "id" | "dashboardId" | "createdAt">,
) =>
  apiFetch<DashboardWidget>(`/dashboards/${dashboardId}/widgets`, {
    method: "POST",
    body: JSON.stringify(widget),
  });
export const updateWidgetLayouts = (
  dashboardId: string,
  layouts: { id: string; x: number; y: number; w: number; h: number }[],
) =>
  apiFetch<{ updated: number }>(`/dashboards/${dashboardId}/widgets`, {
    method: "PUT",
    body: JSON.stringify(layouts),
  });
export const updateDashboardWidget = (
  dashboardId: string,
  widgetId: string,
  data: {
    type?: WidgetType;
    title?: string;
    filterId?: string | null;
    config?: Record<string, unknown>;
  },
) =>
  apiFetch<DashboardWidget>(`/dashboards/${dashboardId}/widgets/${widgetId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const removeDashboardWidget = (dashboardId: string, widgetId: string) =>
  apiFetch<void>(`/dashboards/${dashboardId}/widgets/${widgetId}`, {
    method: "DELETE",
  });
export interface DetectedRecurring {
  name: string;
  frequency: Frequency;
  confidence: number;
  expectedAmount: number;
  amountConsistent: boolean;
  categoryId: string | null;
  categoryName: string | null;
  transactionCount: number;
  transactionIds: string[];
  recentTransactions: {
    id: string;
    date: string;
    payee: string;
    amount: number;
  }[];
  groupKey: string;
}

export const getRecurring = () => apiFetch<Recurring[]>("/recurring");
export const detectRecurring = (minOccurrences = 2, amountTolerance = 0.1) =>
  apiFetch<DetectedRecurring[]>(
    `/recurring/detect?minOccurrences=${minOccurrences}&amountTolerance=${amountTolerance}`,
    { method: "POST", body: JSON.stringify({}) },
  );
export const createRecurring = (
  data: Omit<Recurring, "id" | "createdAt" | "updatedAt">,
) =>
  apiFetch<Recurring>("/recurring", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateRecurring = (
  id: string,
  data: Partial<Omit<Recurring, "id" | "createdAt" | "updatedAt">>,
) =>
  apiFetch<Recurring>(`/recurring/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const deleteRecurring = (id: string) =>
  apiFetch<void>(`/recurring/${id}`, { method: "DELETE" });
export const applyRecurring = (mode: "unlinked" | "all" = "all") =>
  apiFetch<{ linked: number; total: number }>(`/recurring/apply?mode=${mode}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
export const getImportPresets = () =>
  apiFetch<CSVMapperPreset[]>("/import/presets");

export interface CsvPreviewResult {
  fileName: string;
  totalLines: number;
  lines: string[];
  matchedMapper: { id: string; name: string } | null;
}

export interface TestParseResult {
  meta: string[];
  accountSignature: string | null;
  headers: string[];
  rowCount: number;
  sampleRows: {
    date: string;
    dateProcessed: string | null;
    externalId: string;
    type: string;
    payee: string;
    memo?: string;
    amount: number;
  }[];
}

export const previewCSV = async (file: File): Promise<CsvPreviewResult> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/import/preview`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Preview failed: ${res.status}`);
  }
  return res.json();
};

export const testParseCSV = async (
  file: File,
  config: Record<string, unknown>,
): Promise<TestParseResult> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("config", JSON.stringify(config));
  const res = await fetch(`${API_BASE}/import/test-parse`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Test parse failed: ${res.status}`);
  }
  return res.json();
};
export const getCsvMappers = () => apiFetch<CsvMapper[]>("/csv-mappers");
export const getCsvMapper = (id: string) =>
  apiFetch<CsvMapper>(`/csv-mappers/${id}`);
export const createCsvMapper = (mapper: Omit<CsvMapper, "id" | "createdAt">) =>
  apiFetch<CsvMapper>("/csv-mappers", {
    method: "POST",
    body: JSON.stringify(mapper),
  });
export const updateCsvMapper = (
  id: string,
  mapper: Omit<CsvMapper, "id" | "createdAt">,
) =>
  apiFetch<CsvMapper>(`/csv-mappers/${id}`, {
    method: "PUT",
    body: JSON.stringify(mapper),
  });
export const deleteCsvMapper = (id: string) =>
  apiFetch<void>(`/csv-mappers/${id}`, { method: "DELETE" });
export const importCSV = async (file: File): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/import/csv`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Import failed: ${res.status}`);
  }
  return res.json();
};
