import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { categories } from "../db/schema/index.js";
import { CategorySchema, CreateCategorySchema } from "../schemas/index.js";

export async function categoryRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["Categories"],
        description: "List all categories",
        response: {
          200: z.array(CategorySchema),
        },
      },
    },
    async () => {
      return db.select().from(categories).all();
    },
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Categories"],
        description: "Create a category (set parentId for subcategories)",
        body: CreateCategorySchema,
        response: {
          201: CategorySchema,
        },
      },
    },
    async (request, reply) => {
      const category = {
        id: randomUUID(),
        ...request.body,
        parentId: request.body.parentId ?? null,
        createdAt: new Date().toISOString(),
      };
      db.insert(categories).values(category).run();
      return reply.status(201).send(category);
    },
  );
}
