import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  transactions,
  transactionCategories,
  categories,
} from "../db/schema/index.js";
import { TransactionSchema } from "../schemas/index.js";

const TransactionWithCategorySchema = TransactionSchema.extend({
  categoryName: z.string().nullable(),
});

export async function transactionRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["Transactions"],
        description:
          "List transactions, optionally filtered by account or date range",
        querystring: z.object({
          accountId: z.uuid().optional(),
          from: z.iso.date().optional(),
          to: z.iso.date().optional(),
        }),
        response: {
          200: z.array(TransactionWithCategorySchema),
        },
      },
    },
    async (request) => {
      const { accountId, from, to } = request.query;
      const conditions = [];

      if (accountId) {
        conditions.push(eq(transactions.accountId, accountId));
      }
      if (from) {
        conditions.push(gte(transactions.date, from));
      }
      if (to) {
        conditions.push(lte(transactions.date, to));
      }

      const query = db
        .select({
          id: transactions.id,
          accountId: transactions.accountId,
          externalId: transactions.externalId,
          date: transactions.date,
          dateProcessed: transactions.dateProcessed,
          type: transactions.type,
          payee: transactions.payee,
          memo: transactions.memo,
          amount: transactions.amount,
          recurringId: transactions.recurringId,
          createdAt: transactions.createdAt,
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
        );

      if (conditions.length > 0) {
        return query.where(and(...conditions)).all();
      }
      return query.all();
    },
  );

  server.get(
    "/:id",
    {
      schema: {
        tags: ["Transactions"],
        description: "Get a single transaction by ID",
        params: z.object({
          id: z.uuid(),
        }),
        response: {
          200: TransactionSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const txn = db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id))
        .get();

      if (!txn) {
        return reply.status(404).send({ message: "Transaction not found" });
      }
      return txn;
    },
  );
}
