import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { dashboards } from "./dashboards.js";
import { savedFilters } from "./saved-filters.js";

export const dashboardWidgets = sqliteTable("dashboard_widgets", {
  id: text("id").primaryKey(),
  dashboardId: text("dashboard_id")
    .notNull()
    .references(() => dashboards.id),
  type: text("type", {
    enum: ["summary", "categoryBreakdown", "trend", "transactionList"],
  }).notNull(),
  title: text("title").notNull(),
  filterId: text("filter_id").references(() => savedFilters.id),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  w: integer("w").notNull(),
  h: integer("h").notNull(),
  config: text("config", { mode: "json" }).notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});
