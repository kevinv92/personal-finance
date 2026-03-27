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
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
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
