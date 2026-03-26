import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts.js";

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  createdAt: text("created_at").notNull(),
});
