import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { FilterCondition } from "../../schemas/saved-filter.js";

export const savedFilters = sqliteTable("saved_filters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  conditions: text("conditions", { mode: "json" })
    .notNull()
    .$type<FilterCondition[]>(),
  createdAt: text("created_at").notNull(),
});
