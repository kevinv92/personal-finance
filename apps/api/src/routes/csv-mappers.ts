import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { csvMappers } from "../db/schema/index.js";
import { CsvMapperSchema, CreateCsvMapperSchema } from "../schemas/index.js";

export async function csvMapperRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["CSV Mappers"],
        description: "List all CSV mapper configurations",
        response: { 200: z.array(CsvMapperSchema) },
      },
    },
    async () => db.select().from(csvMappers).all(),
  );

  server.get(
    "/:id",
    {
      schema: {
        tags: ["CSV Mappers"],
        description: "Get a CSV mapper by ID",
        params: z.object({ id: z.uuid() }),
        response: {
          200: CsvMapperSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const mapper = db
        .select()
        .from(csvMappers)
        .where(eq(csvMappers.id, request.params.id))
        .get();

      if (!mapper) {
        return reply.status(404).send({ message: "Mapper not found" });
      }
      return mapper;
    },
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["CSV Mappers"],
        description: "Create a CSV mapper configuration",
        body: CreateCsvMapperSchema,
        response: { 201: CsvMapperSchema },
      },
    },
    async (request, reply) => {
      const mapper = {
        id: randomUUID(),
        ...request.body,
        delimiter: request.body.delimiter ?? ",",
        dateFormat: request.body.dateFormat ?? null,
        createdAt: new Date().toISOString(),
      };
      db.insert(csvMappers).values(mapper).run();
      return reply.status(201).send(mapper);
    },
  );

  server.put(
    "/:id",
    {
      schema: {
        tags: ["CSV Mappers"],
        description: "Update a CSV mapper configuration",
        params: z.object({ id: z.uuid() }),
        body: CreateCsvMapperSchema,
        response: {
          200: CsvMapperSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const existing = db
        .select()
        .from(csvMappers)
        .where(eq(csvMappers.id, request.params.id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Mapper not found" });
      }

      const updated = {
        ...existing,
        ...request.body,
        delimiter: request.body.delimiter ?? ",",
        dateFormat: request.body.dateFormat ?? null,
      };
      db.update(csvMappers)
        .set(updated)
        .where(eq(csvMappers.id, request.params.id))
        .run();
      return reply.status(200).send(updated);
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["CSV Mappers"],
        description: "Delete a CSV mapper configuration",
        params: z.object({ id: z.uuid() }),
        response: {
          204: z.void(),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const existing = db
        .select()
        .from(csvMappers)
        .where(eq(csvMappers.id, request.params.id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Mapper not found" });
      }

      db.delete(csvMappers).where(eq(csvMappers.id, request.params.id)).run();
      return reply.status(204).send();
    },
  );
}
