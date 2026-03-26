import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { transactions } from "../db/schema/index.js";
import { TransactionSchema } from "../schemas/index.js";

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
          accountId: z.string().uuid().optional(),
          from: z.string().date().optional(),
          to: z.string().date().optional(),
        }),
        response: {
          200: z.array(TransactionSchema),
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

      if (conditions.length > 0) {
        return db
          .select()
          .from(transactions)
          .where(and(...conditions))
          .all();
      }
      return db.select().from(transactions).all();
    },
  );

  server.get(
    "/:id",
    {
      schema: {
        tags: ["Transactions"],
        description: "Get a single transaction by ID",
        params: z.object({
          id: z.string().uuid(),
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
