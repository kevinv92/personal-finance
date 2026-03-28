"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import {
  getRecurring,
  getCategories,
  getTransactions,
  detectRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  applyRecurring,
  type Recurring,
  type DetectedRecurring,
  type Transaction,
} from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildTransactionsUrl } from "@/lib/filter-url";
import { formatAmount } from "@/lib/format";

type RecurringRow = Recurring & {
  categoryName?: string;
  recentTransactions: Transaction[];
  yearlyTotal: number;
};

const frequencyLabels: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

function EditableName({
  value,
  onSave,
}: {
  value: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1.5 group">
        <span className="font-medium">{value}</span>
        <button
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit name"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="size-3.5"
          >
            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.22 7.306a1 1 0 0 0-.26.442l-.783 2.933a.5.5 0 0 0 .616.617l2.932-.784a1 1 0 0 0 .443-.261l4.793-4.793a1.75 1.75 0 0 0 0-2.475l-.495-.472ZM3.5 4A1.5 1.5 0 0 0 2 5.5v7A1.5 1.5 0 0 0 3.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-3a.5.5 0 0 0-1 0v3a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h3a.5.5 0 0 0 0-1h-3Z" />
          </svg>
        </button>
      </span>
    );
  }

  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim() && draft !== value) onSave(draft.trim());
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (draft.trim() && draft !== value) onSave(draft.trim());
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-7 w-64"
      autoFocus
    />
  );
}

function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <span className="text-gray-400 text-xs">No linked transactions</span>
    );
  }
  return (
    <div className="text-xs space-y-0.5">
      {transactions.map((t) => (
        <div key={t.id} className="flex gap-3">
          <span className="text-gray-500 w-20 shrink-0">{t.date}</span>
          <span
            className={`w-16 shrink-0 text-right tabular-nums ${t.amount < 0 ? "text-red-600" : "text-green-600"}`}
          >
            {formatAmount(t.amount)}
          </span>
          <span className="truncate text-gray-600" title={t.payee}>
            {t.payee}
          </span>
        </div>
      ))}
    </div>
  );
}

function buildFilterForRecurring(row: RecurringRow) {
  // Parse matchKey (format: "PAYEE" or "PAYEE|||MEMO")
  if (row.matchKey) {
    const parts = row.matchKey.split("|||");
    const conditions: {
      field: "payee" | "memo";
      operator: "contains" | "equals";
      value: string[];
    }[] = [{ field: "payee", operator: "contains", value: [parts[0]!] }];
    if (parts[1]) {
      conditions.push({
        field: "memo",
        operator: "contains",
        value: [parts[1]],
      });
    }
    return buildTransactionsUrl(conditions);
  }

  // Fallback: use payee from most recent transaction
  const payee = row.recentTransactions[0]?.payee;
  if (!payee) return "/transactions";
  return buildTransactionsUrl([
    { field: "payee", operator: "contains", value: [payee] },
  ]);
}

const detectedColumnHelper = createColumnHelper<DetectedRecurring>();

const detectedColumns = [
  detectedColumnHelper.accessor("name", {
    header: "Name",
    cell: (info) => (
      <span className="font-medium" title={info.getValue()}>
        {info.getValue().length > 50
          ? info.getValue().slice(0, 47) + "..."
          : info.getValue()}
      </span>
    ),
  }),
  detectedColumnHelper.accessor("frequency", {
    header: "Frequency",
    cell: (info) => frequencyLabels[info.getValue()] ?? info.getValue(),
  }),
  detectedColumnHelper.accessor("expectedAmount", {
    header: "Amount",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className={val < 0 ? "text-red-600" : "text-green-600"}>
          {formatAmount(val)}
        </span>
      );
    },
  }),
  detectedColumnHelper.accessor("amountConsistent", {
    header: "Consistent",
    cell: (info) => (info.getValue() ? "Yes" : "Varies"),
  }),
  detectedColumnHelper.accessor("confidence", {
    header: "Confidence",
    cell: (info) => `${Math.round(info.getValue() * 100)}%`,
  }),
  detectedColumnHelper.accessor("transactionCount", {
    header: "Txns",
  }),
  detectedColumnHelper.accessor("categoryName", {
    header: "Category",
    cell: (info) => info.getValue() ?? <span className="text-gray-400">-</span>,
  }),
  detectedColumnHelper.accessor("recentTransactions", {
    header: "Last 5 Transactions",
    cell: (info) => {
      const txns = info.getValue();
      if (txns.length === 0)
        return <span className="text-gray-400 text-xs">-</span>;
      return (
        <div className="text-xs space-y-0.5">
          {txns.map((t) => (
            <div key={t.id} className="flex gap-3">
              <span className="text-gray-500 w-20 shrink-0">{t.date}</span>
              <span
                className={`w-16 shrink-0 text-right tabular-nums ${t.amount < 0 ? "text-red-600" : "text-green-600"}`}
              >
                {formatAmount(t.amount)}
              </span>
              <span className="truncate text-gray-600" title={t.payee}>
                {t.payee}
              </span>
            </div>
          ))}
        </div>
      );
    },
  }),
];

export default function RecurringPage() {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<DetectedRecurring[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [amountTolerance, setAmountTolerance] = useState(0.1);

  const {
    data: recurring = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["recurring"],
    queryFn: getRecurring,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
  });

  const detectMutation = useMutation({
    mutationFn: () => detectRecurring(2, amountTolerance),
    onSuccess: (data) => {
      setSuggestions(data);
      setShowSuggestions(true);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (suggestion: DetectedRecurring) =>
      createRecurring({
        name: suggestion.name,
        matchKey: suggestion.groupKey,
        frequency: suggestion.frequency,
        expectedAmount: suggestion.amountConsistent
          ? suggestion.expectedAmount
          : null,
        categoryId: suggestion.categoryId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => applyRecurring("all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateRecurring(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecurring(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
    },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const enriched: RecurringRow[] = recurring.map((r) => {
    const catName = r.categoryId ? categoryMap.get(r.categoryId) : undefined;

    // Prefer recurringId-linked transactions, fall back to matchKey
    const linkedTxns = allTransactions.filter((t) => t.recurringId === r.id);

    let matchingTxns = linkedTxns;
    if (matchingTxns.length === 0 && r.matchKey) {
      // Use matchKey to filter: "PAYEE" or "PAYEE|||MEMO"
      const parts = r.matchKey.split("|||");
      const payeeMatch = parts[0]!;
      const memoMatch = parts[1];
      matchingTxns = allTransactions.filter((t) => {
        if (!t.payee.toUpperCase().includes(payeeMatch)) return false;
        if (memoMatch && (!t.memo || !t.memo.toUpperCase().includes(memoMatch)))
          return false;
        return true;
      });
    }

    const sorted = matchingTxns.sort((a, b) => b.date.localeCompare(a.date));
    const recentTxns = sorted.slice(0, 5);

    // Sum all matched transactions for the yearly total
    const yearlyTotal = matchingTxns.reduce((sum, t) => sum + t.amount, 0);

    return {
      ...r,
      categoryName: catName,
      recentTransactions: recentTxns,
      yearlyTotal,
    };
  });

  const existingNames = new Set(recurring.map((r) => r.name));
  const filteredSuggestions = suggestions.filter(
    (s) => !existingNames.has(s.name),
  );

  const columnHelper = createColumnHelper<RecurringRow>();

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => (
        <EditableName
          value={info.getValue()}
          onSave={(name) =>
            renameMutation.mutate({ id: info.row.original.id, name })
          }
        />
      ),
    }),
    columnHelper.accessor("expectedAmount", {
      header: "Expected Amount",
      cell: (info) => {
        const val = info.getValue();
        if (val == null) return <span className="text-gray-400">-</span>;
        return (
          <span
            className={`tabular-nums ${val < 0 ? "text-red-600" : "text-green-600"}`}
          >
            {formatAmount(val)}
          </span>
        );
      },
    }),
    columnHelper.accessor("frequency", {
      header: "Frequency",
      cell: (info) => frequencyLabels[info.getValue()] ?? info.getValue(),
    }),
    columnHelper.accessor("yearlyTotal", {
      header: "Yearly Total",
      cell: (info) => {
        const val = info.getValue();
        if (val === 0) return <span className="text-gray-400">-</span>;
        return (
          <span
            className={`font-medium tabular-nums ${val < 0 ? "text-red-600" : "text-green-600"}`}
          >
            {formatAmount(val)}
          </span>
        );
      },
    }),
    columnHelper.accessor("categoryName", {
      header: "Category",
      cell: (info) =>
        info.getValue() ?? <span className="text-gray-400">-</span>,
    }),
    columnHelper.accessor("recentTransactions", {
      header: "Last 5 Transactions",
      cell: (info) => <RecentTransactions transactions={info.getValue()} />,
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Link
            href={buildFilterForRecurring(info.row.original)}
            className="text-sm text-blue-600 hover:underline whitespace-nowrap"
          >
            View all
          </Link>
          <Button
            variant="destructive"
            size="xs"
            onClick={() => deleteMutation.mutate(info.row.original.id)}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      ),
    }),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Recurring</h2>
        <div className="flex items-end gap-2">
          {recurring.length > 0 && (
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              variant="outline"
            >
              {applyMutation.isPending
                ? "Applying..."
                : applyMutation.isSuccess
                  ? `Linked ${applyMutation.data.linked} txns`
                  : "Reapply to Transactions"}
            </Button>
          )}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Amount tolerance
            </Label>
            <select
              value={amountTolerance}
              onChange={(e) => setAmountTolerance(parseFloat(e.target.value))}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
            >
              <option value={0.05}>5%</option>
              <option value={0.1}>10%</option>
              <option value={0.15}>15%</option>
              <option value={0.2}>20%</option>
              <option value={0.3}>30%</option>
            </select>
          </div>
          <Button
            onClick={() => detectMutation.mutate()}
            disabled={detectMutation.isPending}
            variant="outline"
          >
            {detectMutation.isPending ? "Detecting..." : "Detect Recurring"}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}

      {!isLoading && !error && enriched.length === 0 && !showSuggestions && (
        <p className="text-gray-500">
          No recurring items found. Click &quot;Detect Recurring&quot; to
          analyse your transactions.
        </p>
      )}

      {enriched.length > 0 && <DataTable data={enriched} columns={columns} />}

      {showSuggestions && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">
            Suggestions ({filteredSuggestions.length})
          </h3>

          {detectMutation.isError && (
            <p className="text-red-600 mb-4">
              Detection failed: {detectMutation.error.message}
            </p>
          )}

          {filteredSuggestions.length === 0 ? (
            <p className="text-gray-500">No new recurring patterns detected.</p>
          ) : (
            <DataTable
              data={filteredSuggestions}
              columns={[
                ...detectedColumns,
                detectedColumnHelper.display({
                  id: "actions",
                  header: "",
                  cell: (info) => (
                    <Button
                      size="sm"
                      onClick={() => acceptMutation.mutate(info.row.original)}
                      disabled={acceptMutation.isPending}
                    >
                      Accept
                    </Button>
                  ),
                }),
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}
