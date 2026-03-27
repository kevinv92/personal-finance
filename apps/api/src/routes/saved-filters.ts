import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { savedFilters } from "../db/schema/index.js";
import {
  SavedFilterSchema,
  CreateSavedFilterSchema,
} from "../schemas/index.js";

export async function savedFilterRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["Saved Filters"],
        description: "List all saved filters",
        response: {
          200: z.array(SavedFilterSchema),
        },
      },
    },
    async () => {
      return db.select().from(savedFilters).all();
    },
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Saved Filters"],
        description: "Create a saved filter",
        body: CreateSavedFilterSchema,
        response: {
          201: SavedFilterSchema,
        },
      },
    },
    async (request, reply) => {
      const filter = {
        id: randomUUID(),
        ...request.body,
        createdAt: new Date().toISOString(),
      };
      db.insert(savedFilters).values(filter).run();
      return reply.status(201).send(filter);
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["Saved Filters"],
        description: "Delete a saved filter",
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
        .from(savedFilters)
        .where(eq(savedFilters.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Filter not found" });
      }

      db.delete(savedFilters).where(eq(savedFilters.id, id)).run();
      return reply.status(204).send();
    },
  );
}
