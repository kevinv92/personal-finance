"use client";

import { useQuery } from "@tanstack/react-query";
import { getAccounts, getBanks } from "@/lib/api";

export default function AccountsPage() {
  const {
    data: accounts = [],
    isLoading: loadingAccounts,
    error: accountsError,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts(),
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["banks"],
    queryFn: getBanks,
  });

  const isLoading = loadingAccounts;
  const error = accountsError;

  const bankName = (bankId: string) =>
    banks.find((b) => b.id === bankId)?.name ?? bankId;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Accounts</h2>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}

      {!isLoading && !error && accounts.length === 0 && (
        <p className="text-gray-500">No accounts found.</p>
      )}

      {accounts.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bankName(account.bankId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {account.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        account.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {account.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
