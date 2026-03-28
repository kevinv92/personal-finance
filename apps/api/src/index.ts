import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { healthRoutes } from "./routes/health.js";
import { bankRoutes } from "./routes/banks.js";
import { accountRoutes } from "./routes/accounts.js";
import { transactionRoutes } from "./routes/transactions.js";
import { categoryRoutes } from "./routes/categories.js";
import { transactionCategoryRoutes } from "./routes/transaction-categories.js";
import { categoryRuleRoutes } from "./routes/category-rules.js";
import { savedFilterRoutes } from "./routes/saved-filters.js";
import { dashboardRoutes } from "./routes/dashboards.js";
import { csvMapperRoutes } from "./routes/csv-mappers.js";
import { importRoutes } from "./routes/import.js";
import { recurringRoutes } from "./routes/recurring.js";

const server = Fastify({ logger: true });

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

await server.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});
await server.register(multipart);

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

await server.register(healthRoutes);
await server.register(bankRoutes, { prefix: "/api/banks" });
await server.register(accountRoutes, { prefix: "/api/accounts" });
await server.register(transactionRoutes, { prefix: "/api/transactions" });
await server.register(categoryRoutes, { prefix: "/api/categories" });
await server.register(transactionCategoryRoutes, {
  prefix: "/api/transaction-categories",
});
await server.register(categoryRuleRoutes, { prefix: "/api/category-rules" });
await server.register(savedFilterRoutes, { prefix: "/api/saved-filters" });
await server.register(dashboardRoutes, { prefix: "/api/dashboards" });
await server.register(csvMapperRoutes, { prefix: "/api/csv-mappers" });
await server.register(importRoutes, { prefix: "/api/import" });
await server.register(recurringRoutes, { prefix: "/api/recurring" });

server.get("/api/debug/routes", async () => {
  return server.printRoutes({ commonPrefix: false });
});

const start = async () => {
  try {
    await server.listen({ port: 3001, host: "0.0.0.0" });
    console.log("\nRegistered routes:");
    console.log(server.printRoutes());
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
