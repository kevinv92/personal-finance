"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCategories,
  getCategoryRules,
  createCategoryRule,
  deleteCategoryRule,
  applyCategoryRules,
  type Category,
  type CategoryRule,
} from "@/lib/api";

export default function CategoriesPage() {
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: rules = [], isLoading: loadingRules } = useQuery({
    queryKey: ["categoryRules"],
    queryFn: getCategoryRules,
  });

  const parentCategories = categories.filter((c) => !c.parentId);
  const childCategories = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  const isLoading = loadingCategories || loadingRules;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Categories</h2>

        {isLoading && <p className="text-gray-500">Loading...</p>}

        {!isLoading && categories.length === 0 && (
          <p className="text-gray-500">No categories found.</p>
        )}

        {parentCategories.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subcategories
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parentCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {childCategories(cat.id)
                        .map((c) => c.name)
                        .join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Category Rules</h3>
          <ApplyRulesButtons />
        </div>

        <RuleForm categories={categories} />

        {rules.length === 0 && !isLoading && (
          <p className="text-gray-500 mt-4">No rules defined yet.</p>
        )}

        {rules.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rules.map((rule, index) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    index={index + 1}
                    categoryName={categoryName(rule.categoryId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ApplyRulesButtons() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (mode: "uncategorised" | "all") => applyCategoryRules(mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  return (
    <div className="flex gap-2">
      <button
        onClick={() => mutation.mutate("uncategorised")}
        disabled={mutation.isPending}
        className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
      >
        {mutation.isPending && mutation.variables === "uncategorised"
          ? "Applying..."
          : "Apply to uncategorised"}
      </button>
      <button
        onClick={() => mutation.mutate("all")}
        disabled={mutation.isPending}
        className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {mutation.isPending && mutation.variables === "all"
          ? "Applying..."
          : "Re-apply to all"}
      </button>
      {mutation.isSuccess && (
        <span className="text-sm text-green-600 self-center">
          {mutation.data.categorised}/{mutation.data.total} categorised
        </span>
      )}
    </div>
  );
}

function RuleForm({ categories }: { categories: Category[] }) {
  const queryClient = useQueryClient();
  const [matchField, setMatchField] = useState<"payee" | "memo" | "both">(
    "payee",
  );
  const [matchType, setMatchType] = useState<
    "contains" | "exact" | "startsWith"
  >("contains");
  const [matchValues, setMatchValues] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const mutation = useMutation({
    mutationFn: createCategoryRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryRules"] });
      setMatchValues("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchValues.trim() || !categoryId) return;
    const values = matchValues
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length === 0) return;
    mutation.mutate({ matchField, matchType, matchValues: values, categoryId });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Field
        </label>
        <select
          value={matchField}
          onChange={(e) => setMatchField(e.target.value as typeof matchField)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="payee">Payee</option>
          <option value="memo">Memo</option>
          <option value="both">Both</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Match Type
        </label>
        <select
          value={matchType}
          onChange={(e) => setMatchType(e.target.value as typeof matchType)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="contains">Contains</option>
          <option value="exact">Exact</option>
          <option value="startsWith">Starts With</option>
        </select>
      </div>

      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Match Values (comma-separated)
        </label>
        <input
          type="text"
          value={matchValues}
          onChange={(e) => setMatchValues(e.target.value)}
          placeholder="e.g. WOOLWORTHS, NEW WORLD, FOODIE MART"
          className="border rounded px-3 py-2 text-sm w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Category
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Select...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || !matchValues.trim() || !categoryId}
        className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        Add Rule
      </button>
    </form>
  );
}

function RuleRow({
  rule,
  index,
  categoryName,
}: {
  rule: CategoryRule;
  index: number;
  categoryName: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteCategoryRule(rule.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryRules"] });
    },
  });

  const matchLabel: Record<string, string> = {
    contains: "contains",
    exact: "equals",
    startsWith: "starts with",
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {index}
      </td>
      <td className="px-6 py-4 text-sm">
        <span className="font-medium">{rule.matchField}</span>{" "}
        <span className="text-gray-500">{matchLabel[rule.matchType]}</span>{" "}
        <span className="font-medium">
          {rule.matchValues.map((v) => `"${v}"`).join(", ")}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        {categoryName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
