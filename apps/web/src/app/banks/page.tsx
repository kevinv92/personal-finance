"use client";

import { useQuery } from "@tanstack/react-query";
import { getBanks } from "@/lib/api";

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

      {banks.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {banks.map((bank) => (
                <tr key={bank.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {bank.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(bank.createdAt).toLocaleDateString()}
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
