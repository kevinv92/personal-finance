import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { categories } from "./categories.js";

export const frequencyEnum = [
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "annual",
] as const;

export const recurring = sqliteTable("recurring", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  matchKey: text("match_key"),
  expectedAmount: real("expected_amount"),
  frequency: text("frequency", { enum: frequencyEnum }).notNull(),
  categoryId: text("category_id").references(() => categories.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
