"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  getDashboards,
  createDashboard,
  deleteDashboard,
  type Dashboard,
} from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function DashboardsListPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [newName, setNewName] = useState("");

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: ["dashboards"],
    queryFn: getDashboards,
  });

  const createMutation = useMutation({
    mutationFn: createDashboard,
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setNewName("");
      router.push(`/dashboards/${dashboard.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDashboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim() || `Dashboard ${dashboards.length + 1}`;
    createMutation.mutate({ name });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboards</h2>

      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New dashboard name..."
          className="h-9 flex-1 max-w-sm rounded-lg border border-input bg-transparent px-3 text-sm outline-none"
        />
        <Button type="submit" disabled={createMutation.isPending}>
          Create Dashboard
        </Button>
      </form>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {!isLoading && dashboards.length === 0 && (
        <p className="text-muted-foreground">
          No dashboards yet. Create one to get started.
        </p>
      )}

      {dashboards.length > 0 && (
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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dashboards.map((d) => (
                <DashboardRow
                  key={d.id}
                  dashboard={d}
                  onDelete={() => deleteMutation.mutate(d.id)}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DashboardRow({
  dashboard,
  onDelete,
  isDeleting,
}: {
  dashboard: Dashboard;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const router = useRouter();

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer"
      onClick={() => router.push(`/dashboards/${dashboard.id}`)}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        {dashboard.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(dashboard.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${dashboard.name}"?`)) {
              onDelete();
            }
          }}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
