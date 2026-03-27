import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  transactions,
  categories,
  transactionCategories,
} from "../db/schema/index.js";
import {
  TransactionCategorySchema,
  CreateTransactionCategorySchema,
} from "../schemas/index.js";

export async function transactionCategoryRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["Transaction Categories"],
        description: "List category assignments for a transaction",
        querystring: z.object({
          transactionId: z.uuid(),
        }),
        response: {
          200: z.array(TransactionCategorySchema),
        },
      },
    },
    async (request) => {
      const { transactionId } = request.query;
      return db
        .select()
        .from(transactionCategories)
        .where(eq(transactionCategories.transactionId, transactionId))
        .all();
    },
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Transaction Categories"],
        description: "Assign a category to a transaction",
        body: CreateTransactionCategorySchema,
        response: {
          201: TransactionCategorySchema,
          404: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { transactionId, categoryId } = request.body;

      const txn = db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .get();
      if (!txn) {
        return reply.status(404).send({ message: "Transaction not found" });
      }

      const cat = db
        .select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .get();
      if (!cat) {
        return reply.status(404).send({ message: "Category not found" });
      }

      const existing = db
        .select()
        .from(transactionCategories)
        .where(
          and(
            eq(transactionCategories.transactionId, transactionId),
            eq(transactionCategories.categoryId, categoryId),
          ),
        )
        .get();
      if (existing) {
        return reply
          .status(409)
          .send({ message: "Category already assigned to this transaction" });
      }

      const assignment = {
        id: randomUUID(),
        transactionId,
        categoryId,
        createdAt: new Date().toISOString(),
      };
      db.insert(transactionCategories).values(assignment).run();
      return reply.status(201).send(assignment);
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["Transaction Categories"],
        description: "Remove a category assignment from a transaction",
        params: z.object({
          id: z.uuid(),
        }),
        response: {
          204: z.void(),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = db
        .select()
        .from(transactionCategories)
        .where(eq(transactionCategories.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Assignment not found" });
      }

      db.delete(transactionCategories)
        .where(eq(transactionCategories.id, id))
        .run();
      return reply.status(204).send();
    },
  );
}
