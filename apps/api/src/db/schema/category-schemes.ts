import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const categorySchemes = sqliteTable("category_schemes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});
