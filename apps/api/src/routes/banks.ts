import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { banks } from "../db/schema/index.js";
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
}
