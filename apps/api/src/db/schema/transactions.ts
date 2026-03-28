import { sqliteTable, text, real, index } from "drizzle-orm/sqlite-core";
import { accounts } from "./accounts.js";
import { recurring } from "./recurring.js";

export const transactions = sqliteTable(
  "transactions",
  {
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
    recurringId: text("recurring_id").references(() => recurring.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_transactions_account_id").on(table.accountId),
    index("idx_transactions_date").on(table.date),
    index("idx_transactions_external_id").on(table.externalId),
  ],
);
