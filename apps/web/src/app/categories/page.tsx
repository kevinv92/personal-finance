"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCategorySchemes, getCategories } from "@/lib/api";

export default function CategoriesPage() {
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);

  const {
    data: schemes = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categorySchemes"],
    queryFn: getCategorySchemes,
  });

  // Auto-select first scheme once loaded
  const activeScheme = selectedScheme ?? schemes[0]?.id ?? null;

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", activeScheme],
    queryFn: () => getCategories(activeScheme!),
    enabled: !!activeScheme,
  });

  const parentCategories = categories.filter((c) => c.parentId === null);
  const childCategories = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Categories</h2>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">Error: {error.message}</p>}

      {!isLoading && !error && schemes.length === 0 && (
        <p className="text-gray-500">No category schemes found.</p>
      )}

      {schemes.length > 0 && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {schemes.map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => setSelectedScheme(scheme.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeScheme === scheme.id
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {scheme.name}
                {scheme.isActive && (
                  <span className="ml-2 inline-flex px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>

          {categories.length === 0 && activeScheme && (
            <p className="text-gray-500">No categories in this scheme yet.</p>
          )}

          {parentCategories.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {parentCategories.map((cat) => (
                  <li key={cat.id} className="px-6 py-4">
                    <p className="text-sm font-medium">{cat.name}</p>
                    {childCategories(cat.id).length > 0 && (
                      <ul className="mt-2 ml-4 space-y-1">
                        {childCategories(cat.id).map((child) => (
                          <li key={child.id} className="text-sm text-gray-500">
                            {child.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
