import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { healthRoutes } from "./health.js";

describe("GET /health", () => {
  const server = Fastify();

  beforeAll(async () => {
    server.setValidatorCompiler(validatorCompiler);
    server.setSerializerCompiler(serializerCompiler);
    await server.register(healthRoutes);
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("returns status ok", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("returns 404 for unsupported methods", async () => {
    const methods = ["POST", "PUT", "DELETE", "PATCH"] as const;

    for (const method of methods) {
      const response = await server.inject({
        method,
        url: "/health",
      });

      expect(response.statusCode).toBe(404);
    }
  });

  it("returns 404 for unknown routes", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/nonexistent",
    });

    expect(response.statusCode).toBe(404);
  });
});
