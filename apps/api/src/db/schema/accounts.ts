import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { banks } from "./banks.js";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  bankId: text("bank_id")
    .notNull()
    .references(() => banks.id),
  name: text("name").notNull(),
  accountNumber: text("account_number"),
  type: text("type", { enum: ["checking", "savings", "credit"] }).notNull(),
  currency: text("currency").notNull().default("AUD"),
  csvSignature: text("csv_signature"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});
