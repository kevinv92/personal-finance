import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq, max } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  categoryRules,
  categories,
  transactions,
  transactionCategories,
} from "../db/schema/index.js";
import { matchCategory } from "../lib/category-matcher.js";
import {
  CategoryRuleSchema,
  CreateCategoryRuleSchema,
} from "../schemas/index.js";

export async function categoryRuleRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/",
    {
      schema: {
        tags: ["Category Rules"],
        description: "List all category rules, ordered by priority",
        response: {
          200: z.array(CategoryRuleSchema),
        },
      },
    },
    async () => {
      return db
        .select()
        .from(categoryRules)
        .orderBy(categoryRules.sortOrder)
        .all();
    },
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Category Rules"],
        description: "Create a category rule",
        body: CreateCategoryRuleSchema,
        response: {
          201: CategoryRuleSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const cat = db
        .select()
        .from(categories)
        .where(eq(categories.id, request.body.categoryId))
        .get();

      if (!cat) {
        return reply.status(404).send({ message: "Category not found" });
      }

      // Auto-assign sortOrder to end of list
      const maxOrder = db
        .select({ value: max(categoryRules.sortOrder) })
        .from(categoryRules)
        .get();
      const nextOrder = (maxOrder?.value ?? -1) + 1;

      const rule = {
        id: randomUUID(),
        ...request.body,
        sortOrder: nextOrder,
        createdAt: new Date().toISOString(),
      };
      db.insert(categoryRules).values(rule).run();
      return reply.status(201).send(rule);
    },
  );

  server.post(
    "/apply",
    {
      schema: {
        tags: ["Category Rules"],
        description:
          "Apply category rules to transactions. Use mode=uncategorised (default) or mode=all.",
        querystring: z.object({
          mode: z.enum(["uncategorised", "all"]).default("uncategorised"),
        }),
        response: {
          200: z.object({
            categorised: z.number(),
            total: z.number(),
          }),
        },
      },
    },
    async (request) => {
      const { mode } = request.query;

      if (mode === "all") {
        db.delete(transactionCategories).run();
      }

      const categorisedIds = db
        .select({ transactionId: transactionCategories.transactionId })
        .from(transactionCategories)
        .all()
        .map((r) => r.transactionId);

      const allTxns = db.select().from(transactions).all();
      const txnsToProcess =
        mode === "all"
          ? allTxns
          : allTxns.filter((t) => !categorisedIds.includes(t.id));

      let categorised = 0;
      for (const txn of txnsToProcess) {
        const categoryId = matchCategory({
          payee: txn.payee,
          memo: txn.memo,
        });
        if (categoryId) {
          db.insert(transactionCategories)
            .values({
              id: randomUUID(),
              transactionId: txn.id,
              categoryId,
              createdAt: new Date().toISOString(),
            })
            .run();
          categorised++;
        }
      }

      return { categorised, total: txnsToProcess.length };
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["Category Rules"],
        description: "Delete a category rule",
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
        .from(categoryRules)
        .where(eq(categoryRules.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Rule not found" });
      }

      db.delete(categoryRules).where(eq(categoryRules.id, id)).run();
      return reply.status(204).send();
    },
  );
}
