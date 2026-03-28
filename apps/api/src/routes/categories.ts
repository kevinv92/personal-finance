import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories } from "../db/schema/index.js";
import {
  CategorySchema,
  CreateCategorySchema,
  UpdateCategorySchema,
} from "../schemas/index.js";

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

  server.patch(
    "/:id",
    {
      schema: {
        tags: ["Categories"],
        description: "Update a category",
        params: z.object({ id: z.uuid() }),
        body: UpdateCategorySchema,
        response: {
          200: CategorySchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = db
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Category not found" });
      }

      const updated = { ...existing, ...request.body };
      db.update(categories)
        .set(request.body)
        .where(eq(categories.id, id))
        .run();
      return reply.send(updated);
    },
  );
}
