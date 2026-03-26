import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { categorySchemes } from "./category-schemes.js";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  schemeId: text("scheme_id")
    .notNull()
    .references(() => categorySchemes.id),
  name: text("name").notNull(),
  parentId: text("parent_id"),
  createdAt: text("created_at").notNull(),
});
