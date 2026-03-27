"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import {
  getTransactions,
  getAccounts,
  getBanks,
  type Transaction,
  type FilterCondition,
} from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { FilterBar } from "@/components/filter-bar";
import { createFilterFn } from "@/lib/filter-engine";

type TransactionRow = Transaction & { accountName: string; bankName: string };
const columnHelper = createColumnHelper<TransactionRow>();

const formatAmount = (amount: number) => {
  const formatted = Math.abs(amount).toFixed(2);
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
};

const columns = [
  columnHelper.accessor("date", { header: "Date" }),
  columnHelper.accessor("payee", {
    header: "Payee",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("memo", {
    header: "Memo",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("categoryName", {
    header: "Category",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("bankName", { header: "Bank" }),
  columnHelper.accessor("accountName", { header: "Account" }),
  columnHelper.accessor("amount", {
    header: "Amount",
    cell: (info) => {
      const amount = info.getValue();
      return (
        <span className={amount < 0 ? "text-red-600" : "text-green-600"}>
          {formatAmount(amount)}
        </span>
      );
    },
    meta: { align: "right" },
  }),
];

export default function TransactionsPage() {
  const {
    data: transactions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts(),
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["banks"],
    queryFn: getBanks,
  });

  const [conditions, setConditions] = useState<FilterCondition[]>([]);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const bankNameMap = useMemo(
    () => new Map(banks.map((b) => [b.id, b.name])),
    [banks],
  );

  const allRows = useMemo(
    () =>
      transactions.map((txn) => {
        const account = accountMap.get(txn.accountId);
        return {
          ...txn,
          accountName: account?.name ?? txn.accountId,
          bankName: account
            ? (bankNameMap.get(account.bankId) ?? account.bankId)
            : "",
        };
      }),
    [transactions, accountMap, bankNameMap],
  );

  const filteredData = useMemo(() => {
    if (conditions.length === 0) return allRows;
    const filterFn = createFilterFn(conditions);
    return allRows.filter(filterFn);
  }, [allRows, conditions]);

  const totalAmount = useMemo(
    () => filteredData.reduce((sum, row) => sum + row.amount, 0),
    [filteredData],
  );

  const totalIncome = useMemo(
    () =>
      filteredData
        .filter((r) => r.amount > 0)
        .reduce((sum, r) => sum + r.amount, 0),
    [filteredData],
  );

  const totalExpenses = useMemo(
    () =>
      filteredData
        .filter((r) => r.amount < 0)
        .reduce((sum, r) => sum + r.amount, 0),
    [filteredData],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Transactions</h2>

      <FilterBar conditions={conditions} onChange={setConditions} />

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}

      {!isLoading && !error && filteredData.length === 0 && (
        <p className="text-gray-500">No transactions found.</p>
      )}

      {filteredData.length > 0 && (
        <>
          <div className="flex gap-6 mb-4 text-sm">
            <span className="text-green-600 font-medium">
              Income: {formatAmount(totalIncome)}
            </span>
            <span className="text-red-600 font-medium">
              Expenses: {formatAmount(totalExpenses)}
            </span>
            <span
              className={`font-medium ${totalAmount >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              Net: {formatAmount(totalAmount)}
            </span>
          </div>
          <DataTable
            data={filteredData}
            columns={columns}
            searchable
            pageSize={50}
          />
        </>
      )}
    </div>
  );
}
