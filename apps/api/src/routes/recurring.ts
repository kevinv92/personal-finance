import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  recurring,
  transactions,
  transactionCategories,
  categories,
} from "../db/schema/index.js";
import {
  RecurringSchema,
  CreateRecurringSchema,
  UpdateRecurringSchema,
  FrequencyEnum,
} from "../schemas/index.js";
import {
  isMemoGeneric,
  groupingKey,
  detectFrequency,
  amountConsistency,
} from "../lib/recurring-detection.js";

// --- Detection types ---

interface TransactionRow {
  id: string;
  date: string;
  payee: string;
  memo: string | null;
  amount: number;
  categoryId: string | null;
  categoryName: string | null;
}

export async function recurringRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["Recurring"],
        description: "List all recurring items",
        response: {
          200: z.array(RecurringSchema),
        },
      },
    },
    async () => {
      return db.select().from(recurring).all();
    },
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Recurring"],
        description: "Create a recurring item",
        body: CreateRecurringSchema,
        response: {
          201: RecurringSchema,
        },
      },
    },
    async (request, reply) => {
      const now = new Date().toISOString();
      const item = {
        id: randomUUID(),
        ...request.body,
        matchKey: request.body.matchKey ?? null,
        expectedAmount: request.body.expectedAmount ?? null,
        categoryId: request.body.categoryId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      db.insert(recurring).values(item).run();
      return reply.status(201).send(item);
    },
  );

  server.patch(
    "/:id",
    {
      schema: {
        tags: ["Recurring"],
        description: "Update a recurring item",
        params: z.object({ id: z.uuid() }),
        body: UpdateRecurringSchema,
        response: {
          200: RecurringSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = db
        .select()
        .from(recurring)
        .where(eq(recurring.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Recurring item not found" });
      }

      const updated = {
        ...existing,
        ...request.body,
        updatedAt: new Date().toISOString(),
      };
      db.update(recurring)
        .set({ ...request.body, updatedAt: updated.updatedAt })
        .where(eq(recurring.id, id))
        .run();
      return reply.send(updated);
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["Recurring"],
        description: "Delete a recurring item",
        params: z.object({ id: z.uuid() }),
        response: {
          204: z.undefined(),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = db
        .select()
        .from(recurring)
        .where(eq(recurring.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Recurring item not found" });
      }

      db.delete(recurring).where(eq(recurring.id, id)).run();
      return reply.status(204).send();
    },
  );

  // --- Detection endpoint ---

  const SampleTransactionSchema = z.object({
    id: z.string(),
    date: z.string(),
    payee: z.string(),
    amount: z.number(),
  });

  const DetectedRecurringSchema = z.object({
    name: z.string(),
    frequency: FrequencyEnum,
    confidence: z.number(),
    expectedAmount: z.number(),
    amountConsistent: z.boolean(),
    categoryId: z.string().nullable(),
    categoryName: z.string().nullable(),
    transactionCount: z.number(),
    transactionIds: z.array(z.string()),
    recentTransactions: z.array(SampleTransactionSchema),
    groupKey: z.string(),
  });

  server.post(
    "/detect",
    {
      schema: {
        tags: ["Recurring"],
        description:
          "Analyse transactions and suggest recurring items based on payee/memo grouping, interval regularity, and amount consistency",
        querystring: z.object({
          minOccurrences: z.coerce.number().int().min(2).default(2),
          amountTolerance: z.coerce.number().min(0).max(1).default(0.1),
        }),
        response: {
          200: z.array(DetectedRecurringSchema),
        },
      },
    },
    async (request) => {
      const { minOccurrences, amountTolerance } = request.query;

      // Fetch all transactions with category info
      const rows: TransactionRow[] = db
        .select({
          id: transactions.id,
          date: transactions.date,
          payee: transactions.payee,
          memo: transactions.memo,
          amount: transactions.amount,
          categoryId: categories.id,
          categoryName: categories.name,
        })
        .from(transactions)
        .leftJoin(
          transactionCategories,
          eq(transactions.id, transactionCategories.transactionId),
        )
        .leftJoin(
          categories,
          eq(transactionCategories.categoryId, categories.id),
        )
        .all();

      // Group by payee+memo key
      const groups = new Map<string, TransactionRow[]>();
      for (const row of rows) {
        const key = groupingKey(row.payee, row.memo);
        const list = groups.get(key) ?? [];
        list.push(row);
        groups.set(key, list);
      }

      const suggestions: z.infer<typeof DetectedRecurringSchema>[] = [];

      for (const [key, txns] of groups) {
        if (txns.length < minOccurrences) continue;

        const dates = txns.map((t) => t.date);
        const freqMatch = detectFrequency(dates);
        if (!freqMatch) continue;

        const amounts = txns.map((t) => t.amount);
        const { consistent, median } = amountConsistency(
          amounts,
          amountTolerance,
        );

        // Derive a human-readable name from the first transaction's payee
        const samplePayee = txns[0]!.payee;
        const sampleMemo = txns[0]!.memo;
        let name = samplePayee;
        // If memo is meaningful and different from payee, append it
        if (!isMemoGeneric(sampleMemo) && sampleMemo) {
          name = `${samplePayee} — ${sampleMemo}`;
        }
        // Trim long names
        if (name.length > 80) name = name.slice(0, 77) + "...";

        // Use most common category from the group
        const categoryCounts = new Map<
          string,
          { id: string; name: string; count: number }
        >();
        for (const t of txns) {
          if (t.categoryId && t.categoryName) {
            const entry = categoryCounts.get(t.categoryId) ?? {
              id: t.categoryId,
              name: t.categoryName,
              count: 0,
            };
            entry.count++;
            categoryCounts.set(t.categoryId, entry);
          }
        }
        let topCategory: { id: string; name: string } | null = null;
        let topCount = 0;
        for (const entry of categoryCounts.values()) {
          if (entry.count > topCount) {
            topCount = entry.count;
            topCategory = { id: entry.id, name: entry.name };
          }
        }

        // Most recent 5 transactions for preview
        const recentTransactions = [...txns]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 5)
          .map((t) => ({
            id: t.id,
            date: t.date,
            payee: t.payee,
            amount: t.amount,
          }));

        suggestions.push({
          name,
          frequency: freqMatch.frequency,
          confidence: Math.round(freqMatch.confidence * 100) / 100,
          expectedAmount: Math.round(median * 100) / 100,
          amountConsistent: consistent,
          categoryId: topCategory?.id ?? null,
          categoryName: topCategory?.name ?? null,
          transactionCount: txns.length,
          transactionIds: txns.map((t) => t.id),
          recentTransactions,
          groupKey: key,
        });
      }

      // Sort by confidence descending, then by transaction count
      suggestions.sort(
        (a, b) =>
          b.confidence - a.confidence ||
          b.transactionCount - a.transactionCount,
      );

      return suggestions;
    },
  );

  // --- Apply recurring to transactions ---

  server.post(
    "/apply",
    {
      schema: {
        tags: ["Recurring"],
        description:
          "Link transactions to existing recurring items by matching their payee/memo grouping key. Mode 'unlinked' only processes transactions without a recurringId, 'all' re-processes everything.",
        querystring: z.object({
          mode: z.enum(["unlinked", "all"]).default("all"),
        }),
        response: {
          200: z.object({ linked: z.number(), total: z.number() }),
        },
      },
    },
    async (request) => {
      const { mode } = request.query;

      // Get all recurring items with a matchKey
      const recurringItems = db.select().from(recurring).all();
      const keyToRecurring = new Map<string, string>();
      for (const r of recurringItems) {
        if (r.matchKey) keyToRecurring.set(r.matchKey, r.id);
      }

      if (keyToRecurring.size === 0) {
        return { linked: 0, total: 0 };
      }

      // Get transactions
      const allTxns =
        mode === "unlinked"
          ? db
              .select()
              .from(transactions)
              .where(eq(transactions.recurringId, ""))
              .all()
              // SQLite: null != '' so we need IS NULL
              .concat(
                db
                  .select()
                  .from(transactions)
                  .all()
                  .filter((t) => t.recurringId === null),
              )
          : db.select().from(transactions).all();

      // Deduplicate (the unlinked query might overlap)
      const seen = new Set<string>();
      const txns = allTxns.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      let linked = 0;
      for (const txn of txns) {
        const key = groupingKey(txn.payee, txn.memo);
        const recurringId = keyToRecurring.get(key);
        if (recurringId) {
          db.update(transactions)
            .set({ recurringId })
            .where(eq(transactions.id, txn.id))
            .run();
          linked++;
        }
      }

      return { linked, total: txns.length };
    },
  );
}
