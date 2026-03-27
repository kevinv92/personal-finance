"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import {
  getCategories,
  getCategoryRules,
  createCategoryRule,
  deleteCategoryRule,
  applyCategoryRules,
  type Category,
  type CategoryRule,
} from "@/lib/api";
import { DataTable } from "@/components/data-table";

type CategoryRow = { name: string; subcategories: string };
const categoryColumnHelper = createColumnHelper<CategoryRow>();

const categoryColumns = [
  categoryColumnHelper.accessor("name", {
    header: "Category",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  categoryColumnHelper.accessor("subcategories", {
    header: "Subcategories",
    cell: (info) => info.getValue() || "—",
  }),
];

export default function CategoriesPage() {
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: rules = [], isLoading: loadingRules } = useQuery({
    queryKey: ["categoryRules"],
    queryFn: getCategoryRules,
  });

  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  const categoryRows = useMemo(() => {
    const parents = categories.filter((c) => !c.parentId);
    return parents.map((cat) => ({
      name: cat.name,
      subcategories: categories
        .filter((c) => c.parentId === cat.id)
        .map((c) => c.name)
        .join(", "),
    }));
  }, [categories]);

  const ruleRows = useMemo(
    () => rules.map((rule, index) => ({ ...rule, index: index + 1 })),
    [rules],
  );

  const isLoading = loadingCategories || loadingRules;

  const matchLabel: Record<string, string> = {
    contains: "contains",
    exact: "equals",
    startsWith: "starts with",
  };

  const ruleColumnHelper = createColumnHelper<
    CategoryRule & { index: number }
  >();

  const ruleColumns = useMemo(
    () => [
      ruleColumnHelper.accessor("index", { header: "#" }),
      ruleColumnHelper.display({
        id: "match",
        header: "Match",
        cell: (info) => {
          const rule = info.row.original;
          return (
            <>
              <span className="font-medium">{rule.matchField}</span>{" "}
              <span className="text-gray-500">
                {matchLabel[rule.matchType]}
              </span>{" "}
              <span className="font-medium">
                {rule.matchValues.map((v) => `"${v}"`).join(", ")}
              </span>
            </>
          );
        },
      }),
      ruleColumnHelper.display({
        id: "category",
        header: "Category",
        cell: (info) => (
          <span className="font-medium">
            {categoryName(info.row.original.categoryId)}
          </span>
        ),
      }),
      ruleColumnHelper.display({
        id: "actions",
        header: "Actions",
        meta: { align: "right" },
        cell: (info) => <DeleteRuleButton ruleId={info.row.original.id} />,
      }),
    ],
    [categories],
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-6">Categories</h2>

        {isLoading && <p className="text-gray-500">Loading...</p>}

        {!isLoading && categories.length === 0 && (
          <p className="text-gray-500">No categories found.</p>
        )}

        {categoryRows.length > 0 && (
          <DataTable data={categoryRows} columns={categoryColumns} />
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

        {ruleRows.length > 0 && (
          <div className="mt-4">
            <DataTable data={ruleRows} columns={ruleColumns} />
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteRuleButton({ ruleId }: { ruleId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteCategoryRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryRules"] });
    },
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
    >
      Delete
    </button>
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
