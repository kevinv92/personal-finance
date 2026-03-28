import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.API_URL ?? "http://localhost:3001/api";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: options?.body
      ? { "Content-Type": "application/json", ...options?.headers }
      : options?.headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `API error: ${res.status}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const server = new McpServer({
  name: "personal-finance",
  version: "1.0.0",
});

// --- Tools ---

server.tool(
  "list_transactions",
  "List transactions, optionally filtered. Returns date, payee, memo, amount, category, and account.",
  {
    accountId: z.string().optional().describe("Filter by account ID"),
    from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z
      .number()
      .optional()
      .default(50)
      .describe("Max results (default 50)"),
  },
  async ({ accountId, from, to, limit }) => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();

    const txns = await api<unknown[]>(`/transactions${qs ? `?${qs}` : ""}`);
    const sliced = txns.slice(0, limit);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(sliced, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "list_uncategorised_transactions",
  "List transactions that have no category assigned. Useful for finding transactions that need categorisation.",
  {
    limit: z
      .number()
      .optional()
      .default(50)
      .describe("Max results (default 50)"),
  },
  async ({ limit }) => {
    const txns = await api<{ categoryName: string | null }[]>("/transactions");
    const uncategorised = txns.filter((t) => !t.categoryName).slice(0, limit);

    return {
      content: [
        {
          type: "text" as const,
          text: `${uncategorised.length} uncategorised transactions:\n${JSON.stringify(uncategorised, null, 2)}`,
        },
      ],
    };
  },
);

server.tool(
  "list_categories",
  "List all categories with their parent/child hierarchy.",
  {},
  async () => {
    const categories =
      await api<{ id: string; name: string; parentId: string | null }[]>(
        "/categories",
      );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(categories, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "create_category",
  "Create a new category. Optionally set parentId to make it a subcategory.",
  {
    name: z.string().min(1).describe("Category name"),
    parentId: z
      .string()
      .optional()
      .describe("Parent category ID (for subcategories)"),
  },
  async ({ name, parentId }) => {
    const category = await api<unknown>("/categories", {
      method: "POST",
      body: JSON.stringify({ name, parentId }),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Category created:\n${JSON.stringify(category, null, 2)}`,
        },
      ],
    };
  },
);

server.tool(
  "update_category",
  "Update an existing category's name or parent.",
  {
    id: z.string().describe("Category ID to update"),
    name: z.string().optional().describe("New category name"),
    parentId: z
      .string()
      .nullable()
      .optional()
      .describe("New parent category ID (null to make top-level)"),
  },
  async ({ id, name, parentId }) => {
    const body: Record<string, unknown> = {};
    if (name !== undefined) body.name = name;
    if (parentId !== undefined) body.parentId = parentId;

    const category = await api<unknown>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Category updated:\n${JSON.stringify(category, null, 2)}`,
        },
      ],
    };
  },
);

server.tool(
  "list_category_rules",
  "List all category rules in priority order. Rules auto-categorise transactions on import.",
  {},
  async () => {
    const rules = await api<unknown[]>("/category-rules");

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(rules, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "get_spending_summary",
  "Get spending summary grouped by category. Shows total income, expenses, and per-category breakdown.",
  {
    from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date (YYYY-MM-DD)"),
  },
  async ({ from, to }) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();

    const txns = await api<{ amount: number; categoryName: string | null }[]>(
      `/transactions${qs ? `?${qs}` : ""}`,
    );

    const totalIncome = txns
      .filter((t) => t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txns
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + t.amount, 0);

    const byCategory = new Map<string, number>();
    for (const t of txns) {
      if (t.amount < 0) {
        const cat = t.categoryName ?? "Uncategorised";
        byCategory.set(cat, (byCategory.get(cat) ?? 0) + Math.abs(t.amount));
      }
    }

    const sorted = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }));

    const summary = {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      net: Math.round((totalIncome + totalExpenses) * 100) / 100,
      transactionCount: txns.length,
      uncategorisedCount: txns.filter((t) => !t.categoryName).length,
      byCategory: sorted,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "create_category_rule",
  "Create a new category rule for auto-categorising transactions. The rule matches against payee and/or memo fields.",
  {
    categoryId: z.string().describe("Category ID to assign"),
    matchField: z
      .enum(["payee", "memo", "both"])
      .describe("Which field to match against"),
    matchType: z
      .enum(["contains", "exact", "startsWith"])
      .describe("How to match"),
    matchValues: z
      .array(z.string())
      .describe("Values to match (any match triggers the rule)"),
  },
  async ({ categoryId, matchField, matchType, matchValues }) => {
    const rule = await api<unknown>("/category-rules", {
      method: "POST",
      body: JSON.stringify({ categoryId, matchField, matchType, matchValues }),
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Rule created:\n${JSON.stringify(rule, null, 2)}`,
        },
      ],
    };
  },
);

server.tool(
  "apply_category_rules",
  "Apply category rules to transactions. Use mode 'uncategorised' to only process unmatched transactions, or 'all' to re-categorise everything.",
  {
    mode: z
      .enum(["uncategorised", "all"])
      .default("uncategorised")
      .describe("'uncategorised' (default) or 'all'"),
  },
  async ({ mode }) => {
    const result = await api<{ categorised: number; total: number }>(
      `/category-rules/apply?mode=${mode}`,
      { method: "POST", body: JSON.stringify({}) },
    );

    return {
      content: [
        {
          type: "text" as const,
          text: `Applied rules: ${result.categorised}/${result.total} transactions categorised`,
        },
      ],
    };
  },
);

server.tool("list_accounts", "List all bank accounts.", {}, async () => {
  const accounts = await api<unknown[]>("/accounts");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(accounts, null, 2),
      },
    ],
  };
});

server.tool("list_banks", "List all banks.", {}, async () => {
  const banks = await api<unknown[]>("/banks");

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(banks, null, 2),
      },
    ],
  };
});

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Personal Finance MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
