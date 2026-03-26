import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { categorySchemes } from "../db/schema/index.js";
import {
  CategorySchemeSchema,
  CreateCategorySchemeSchema,
} from "../schemas/index.js";

export async function categorySchemeRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["Category Schemes"],
        description: "List all category schemes",
        response: {
          200: z.array(CategorySchemeSchema),
        },
      },
    },
    async () => {
      return db.select().from(categorySchemes).all();
    },
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Category Schemes"],
        description: "Create a category scheme",
        body: CreateCategorySchemeSchema,
        response: {
          201: CategorySchemeSchema,
        },
      },
    },
    async (request, reply) => {
      const scheme = {
        id: randomUUID(),
        ...request.body,
        isActive: false,
        createdAt: new Date().toISOString(),
      };
      db.insert(categorySchemes).values(scheme).run();
      return reply.status(201).send(scheme);
    },
  );
}
