import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { z } from "zod/v4";

const server = Fastify({ logger: true });

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

await server.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Personal Finance API",
      description: "API for managing personal finance data",
      version: "0.1.0",
    },
  },
  transform: jsonSchemaTransform,
});

await server.register(fastifySwaggerUi, {
  routePrefix: "/docs",
});

server.get(
  "/health",
  {
    schema: {
      tags: ["System"],
      description: "Health check endpoint",
      response: {
        200: z.object({
          status: z.literal("ok"),
        }),
      },
    },
  },
  async () => {
    return { status: "ok" as const };
  },
);

const start = async () => {
  try {
    await server.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
