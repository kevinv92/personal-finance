import { FastifyInstance } from "fastify";
import { z } from "zod/v4";

export async function healthRoutes(server: FastifyInstance) {
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
}
