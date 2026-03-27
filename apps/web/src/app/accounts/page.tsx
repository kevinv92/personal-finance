"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { getAccounts, getBanks, type Account } from "@/lib/api";
import { DataTable } from "@/components/data-table";

type AccountRow = Account & { bankName: string };
const columnHelper = createColumnHelper<AccountRow>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("bankName", { header: "Bank" }),
  columnHelper.accessor("type", {
    header: "Type",
    cell: (info) => <span className="capitalize">{info.getValue()}</span>,
  }),
  columnHelper.accessor("isActive", {
    header: "Status",
    cell: (info) => {
      const active = info.getValue();
      return (
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
            active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}
        >
          {active ? "Active" : "Inactive"}
        </span>
      );
    },
  }),
];

export default function AccountsPage() {
  const {
    data: accounts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts(),
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["banks"],
    queryFn: getBanks,
  });

  const bankNameMap = useMemo(
    () => new Map(banks.map((b) => [b.id, b.name])),
    [banks],
  );

  const data = useMemo(
    () =>
      accounts.map((a) => ({
        ...a,
        bankName: bankNameMap.get(a.bankId) ?? a.bankId,
      })),
    [accounts, bankNameMap],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Accounts</h2>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}

      {!isLoading && !error && data.length === 0 && (
        <p className="text-gray-500">No accounts found.</p>
      )}

      {data.length > 0 && <DataTable data={data} columns={columns} />}
    </div>
  );
}
