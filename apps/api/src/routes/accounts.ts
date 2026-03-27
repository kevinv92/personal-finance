import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { accounts } from "../db/schema/index.js";
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
}
