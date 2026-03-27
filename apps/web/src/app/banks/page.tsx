"use client";

import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { getBanks, type Bank } from "@/lib/api";
import { DataTable } from "@/components/data-table";

const columnHelper = createColumnHelper<Bank>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
];

export default function BanksPage() {
  const {
    data: banks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["banks"],
    queryFn: getBanks,
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Banks</h2>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}

      {!isLoading && !error && banks.length === 0 && (
        <p className="text-gray-500">No banks found.</p>
      )}

      {banks.length > 0 && <DataTable data={banks} columns={columns} />}
    </div>
  );
}
