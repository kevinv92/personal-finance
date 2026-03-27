import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod/v4";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { dashboards, dashboardWidgets } from "../db/schema/index.js";
import {
  DashboardSchema,
  CreateDashboardSchema,
  DashboardWidgetSchema,
  CreateDashboardWidgetSchema,
  UpdateWidgetLayoutSchema,
  WidgetTypeEnum,
  widgetConfigDefaults,
} from "../schemas/index.js";

export async function dashboardRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // --- Dashboards CRUD ---

  server.get(
    "/",
    {
      schema: {
        tags: ["Dashboards"],
        description: "List all dashboards",
        response: { 200: z.array(DashboardSchema) },
      },
    },
    async () => db.select().from(dashboards).all(),
  );

  server.post(
    "/",
    {
      schema: {
        tags: ["Dashboards"],
        description: "Create a dashboard",
        body: CreateDashboardSchema,
        response: { 201: DashboardSchema },
      },
    },
    async (request, reply) => {
      const dashboard = {
        id: randomUUID(),
        ...request.body,
        createdAt: new Date().toISOString(),
      };
      db.insert(dashboards).values(dashboard).run();
      return reply.status(201).send(dashboard);
    },
  );

  server.patch(
    "/:id",
    {
      schema: {
        tags: ["Dashboards"],
        description: "Rename a dashboard",
        params: z.object({ id: z.uuid() }),
        body: z.object({ name: z.string().min(1) }),
        response: {
          200: DashboardSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const existing = db
        .select()
        .from(dashboards)
        .where(eq(dashboards.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Dashboard not found" });
      }

      const updated = { ...existing, name: request.body.name };
      db.update(dashboards).set(updated).where(eq(dashboards.id, id)).run();
      return reply.status(200).send(updated);
    },
  );

  server.delete(
    "/:id",
    {
      schema: {
        tags: ["Dashboards"],
        description: "Delete a dashboard and its widgets",
        params: z.object({ id: z.uuid() }),
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
        .from(dashboards)
        .where(eq(dashboards.id, id))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Dashboard not found" });
      }

      db.delete(dashboardWidgets)
        .where(eq(dashboardWidgets.dashboardId, id))
        .run();
      db.delete(dashboards).where(eq(dashboards.id, id)).run();
      return reply.status(204).send();
    },
  );

  // --- Widgets CRUD ---

  server.get(
    "/:id/widgets",
    {
      schema: {
        tags: ["Dashboards"],
        description: "List widgets for a dashboard",
        params: z.object({ id: z.uuid() }),
        response: { 200: z.array(DashboardWidgetSchema) },
      },
    },
    async (request) => {
      const { id } = request.params;
      return db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.dashboardId, id))
        .all();
    },
  );

  server.post(
    "/:id/widgets",
    {
      schema: {
        tags: ["Dashboards"],
        description: "Add a widget to a dashboard",
        params: z.object({ id: z.uuid() }),
        body: CreateDashboardWidgetSchema,
        response: {
          201: DashboardWidgetSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const dashboard = db
        .select()
        .from(dashboards)
        .where(eq(dashboards.id, id))
        .get();

      if (!dashboard) {
        return reply.status(404).send({ message: "Dashboard not found" });
      }

      const defaultConfig = widgetConfigDefaults[request.body.type] ?? {};
      const widget = {
        id: randomUUID(),
        dashboardId: id,
        ...request.body,
        filterId: request.body.filterId ?? null,
        config: request.body.config ?? defaultConfig,
        createdAt: new Date().toISOString(),
      };
      db.insert(dashboardWidgets).values(widget).run();
      return reply.status(201).send(widget);
    },
  );

  server.put(
    "/:id/widgets",
    {
      schema: {
        tags: ["Dashboards"],
        description: "Update all widget positions (bulk layout save)",
        params: z.object({ id: z.uuid() }),
        body: UpdateWidgetLayoutSchema,
        response: { 200: z.object({ updated: z.number() }) },
      },
    },
    async (request) => {
      const layouts = request.body;
      let updated = 0;

      for (const layout of layouts) {
        const result = db
          .update(dashboardWidgets)
          .set({ x: layout.x, y: layout.y, w: layout.w, h: layout.h })
          .where(eq(dashboardWidgets.id, layout.id))
          .run();
        if (result.changes > 0) updated++;
      }

      return { updated };
    },
  );

  server.patch(
    "/:dashboardId/widgets/:widgetId",
    {
      schema: {
        tags: ["Dashboards"],
        description: "Update a widget's config (title, type, filter)",
        params: z.object({
          dashboardId: z.uuid(),
          widgetId: z.uuid(),
        }),
        body: z.object({
          type: WidgetTypeEnum.optional(),
          title: z.string().min(1).optional(),
          filterId: z.uuid().nullable().optional(),
          config: z.any().optional(),
        }),
        response: {
          200: DashboardWidgetSchema,
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { widgetId } = request.params;
      const existing = db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, widgetId))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Widget not found" });
      }

      const updated = { ...existing, ...request.body };
      db.update(dashboardWidgets)
        .set(updated)
        .where(eq(dashboardWidgets.id, widgetId))
        .run();
      return reply.status(200).send(updated);
    },
  );

  server.delete(
    "/:dashboardId/widgets/:widgetId",
    {
      schema: {
        tags: ["Dashboards"],
        description: "Remove a widget from a dashboard",
        params: z.object({
          dashboardId: z.uuid(),
          widgetId: z.uuid(),
        }),
        response: {
          204: z.void(),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { widgetId } = request.params;
      const existing = db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, widgetId))
        .get();

      if (!existing) {
        return reply.status(404).send({ message: "Widget not found" });
      }

      db.delete(dashboardWidgets)
        .where(eq(dashboardWidgets.id, widgetId))
        .run();
      return reply.status(204).send();
    },
  );
}
