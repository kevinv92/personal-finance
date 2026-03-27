import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts.js";

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  externalId: text("external_id"),
  date: text("date").notNull(),
  dateProcessed: text("date_processed"),
  type: text("type"),
  payee: text("payee").notNull(),
  memo: text("memo"),
  amount: real("amount").notNull(),
  createdAt: text("created_at").notNull(),
});
