import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  accounts,
  transactions,
  transactionCategories,
} from "../db/schema/index.js";
import { inArray } from "drizzle-orm";
import { AccountSchema, CreateAccountSchema } from "../schemas/index.js";

const UpdateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  accountNumber: z.string().optional(),
  type: z.enum(["checking", "savings", "credit"]).optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
});

export async function accountRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["Accounts"],
        description: "List all accounts, optionally filtered by bank",
        querystring: z.object({
          bankId: z.uuid().optional(),
        }),
        response: {
          200: z.array(AccountSchema),
        },
      },
    },
    async (request) => {
      const { bankId } = request.query;
      if (bankId) {
        return db
          .select()
          .from(accounts)
          .where(eq(accounts.bankId, bankId))
          .all();
      }
      return db.select().from(accounts).all();
    },
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Accounts"],
        description: "Create an account",
        body: CreateAccountSchema,
        response: {
          201: AccountSchema,
        },
      },
    },
    async (request, reply) => {
      const account = {
        id: randomUUID(),
        ...request.body,
        accountNumber: request.body.accountNumber ?? null,
        csvSignature: null,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      db.insert(accounts).values(account).run();
      return reply.status(201).send(account);
    },
  );

  server.put(
    "/:id",
    {
      schema: {
        tags: ["Accounts"],
        description: "Update an account",
        params: z.object({
          id: z.uuid(),
        }),
        body: UpdateAccountSchema,
        response: {
          200: AccountSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = db
        .select()
        .from(accounts)
        .where(eq(accounts.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Account not found" });
      }

      const updated = { ...existing, ...request.body };
      db.update(accounts).set(updated).where(eq(accounts.id, id)).run();
      return updated;
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["Accounts"],
        description: "Delete an account and all its transactions",
        params: z.object({ id: z.uuid() }),
        response: {
          200: z.object({
            deleted: z.object({
              transactions: z.number(),
              account: z.number(),
            }),
          }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = db
        .select()
        .from(accounts)
        .where(eq(accounts.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Account not found" });
      }

      // Get transaction IDs for this account
      const txnIds = db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.accountId, id))
        .all()
        .map((t) => t.id);

      // Delete transaction categories
      if (txnIds.length > 0) {
        db.delete(transactionCategories)
          .where(inArray(transactionCategories.transactionId, txnIds))
          .run();
      }

      // Delete transactions
      const txnResult = db
        .delete(transactions)
        .where(eq(transactions.accountId, id))
        .run();

      // Delete account
      db.delete(accounts).where(eq(accounts.id, id)).run();

      return {
        deleted: {
          transactions: txnResult.changes,
          account: 1,
        },
      };
    },
  );
}
