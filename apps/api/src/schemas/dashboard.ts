import { z } from "zod/v4";

export const WidgetTypeEnum = z.enum([
  "summary",
  "categoryBreakdown",
  "trend",
  "transactionList",
]);

export const DashboardSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const CreateDashboardSchema = z.object({
  name: z.string().min(1),
});

export const DashboardWidgetSchema = z.object({
  id: z.uuid(),
  dashboardId: z.uuid(),
  type: WidgetTypeEnum,
  title: z.string().min(1),
  filterId: z.uuid().nullable(),
  x: z.number().int(),
  y: z.number().int(),
  w: z.number().int(),
  h: z.number().int(),
  config: z.any().default({}),
  createdAt: z.iso.datetime(),
});

export const CreateDashboardWidgetSchema = z.object({
  type: WidgetTypeEnum,
  title: z.string().min(1),
  filterId: z.uuid().nullable().optional(),
  x: z.number().int().default(0),
  y: z.number().int().default(0),
  w: z.number().int(),
  h: z.number().int(),
  config: z.any().optional(),
});

export const UpdateWidgetLayoutSchema = z.array(
  z.object({
    id: z.uuid(),
    x: z.number().int(),
    y: z.number().int(),
    w: z.number().int(),
    h: z.number().int(),
  }),
);

export type Dashboard = z.infer<typeof DashboardSchema>;
export type CreateDashboard = z.infer<typeof CreateDashboardSchema>;
export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;
export type CreateDashboardWidget = z.infer<typeof CreateDashboardWidgetSchema>;
