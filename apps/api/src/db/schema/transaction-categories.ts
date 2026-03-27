import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { transactions } from "./transactions.js";
import { categories } from "./categories.js";

export const transactionCategories = sqliteTable(
  "transaction_categories",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_txn_categories_transaction_id").on(table.transactionId),
    index("idx_txn_categories_category_id").on(table.categoryId),
  ],
);
