import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const csvMappers = sqliteTable("csv_mappers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  bank: text("bank").notNull(),
  accountType: text("account_type", {
    enum: ["checking", "savings", "credit"],
  }).notNull(),
  csvSignature: text("csv_signature").notNull(),
  metaLineStart: integer("meta_line_start").notNull(),
  metaLineEnd: integer("meta_line_end").notNull(),
  headerRow: integer("header_row").notNull(),
  dataStartRow: integer("data_start_row").notNull(),
  accountMetaLine: integer("account_meta_line").notNull(),
  delimiter: text("delimiter").default(","),
  columnMap: text("column_map", { mode: "json" })
    .notNull()
    .$type<Record<string, string>>(),
  dateFormat: text("date_format"),
  invertAmount: integer("invert_amount", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
});
