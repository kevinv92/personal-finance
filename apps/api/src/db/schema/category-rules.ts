import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { categories } from "./categories.js";

export const categoryRules = sqliteTable("category_rules", {
  id: text("id").primaryKey(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  matchField: text("match_field", {
    enum: ["payee", "memo", "both"],
  }).notNull(),
  matchType: text("match_type", {
    enum: ["contains", "exact", "startsWith"],
  }).notNull(),
  matchValues: text("match_values", { mode: "json" })
    .notNull()
    .$type<string[]>(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
