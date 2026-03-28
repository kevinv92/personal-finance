import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  banks,
  accounts,
  transactions,
  transactionCategories,
} from "../db/schema/index.js";
import { BankSchema, CreateBankSchema } from "../schemas/index.js";

export async function bankRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["Banks"],
        description: "List all banks",
        response: {
          200: z.array(BankSchema),
        },
      },
    },
    async () => {
      return db.select().from(banks).all();
    },
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Banks"],
        description: "Create a bank",
        body: CreateBankSchema,
        response: {
          201: BankSchema,
        },
      },
    },
    async (request, reply) => {
      const bank = {
        id: randomUUID(),
        ...request.body,
        createdAt: new Date().toISOString(),
      };
      db.insert(banks).values(bank).run();
      return reply.status(201).send(bank);
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["Banks"],
        description: "Delete a bank, its accounts, and all their transactions",
        params: z.object({ id: z.uuid() }),
        response: {
          200: z.object({
            deleted: z.object({
              transactions: z.number(),
              accounts: z.number(),
              bank: z.number(),
            }),
          }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = db.select().from(banks).where(eq(banks.id, id)).get();

      if (!existing) {
        return reply.status(404).send({ message: "Bank not found" });
      }

      // Get account IDs for this bank
      const accountIds = db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.bankId, id))
        .all()
        .map((a) => a.id);

      let deletedTxns = 0;

      if (accountIds.length > 0) {
        // Get transaction IDs for all accounts
        const txnIds = db
          .select({ id: transactions.id })
          .from(transactions)
          .where(inArray(transactions.accountId, accountIds))
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
          .where(inArray(transactions.accountId, accountIds))
          .run();
        deletedTxns = txnResult.changes;

        // Delete accounts
        db.delete(accounts).where(eq(accounts.bankId, id)).run();
      }

      // Delete bank
      db.delete(banks).where(eq(banks.id, id)).run();

      return {
        deleted: {
          transactions: deletedTxns,
          accounts: accountIds.length,
          bank: 1,
        },
      };
    },
  );
}
