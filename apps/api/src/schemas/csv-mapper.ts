import { z } from "zod/v4";

export const TransactionFieldEnum = z.enum([
  "date",
  "dateProcessed",
  "externalId",
  "type",
  "payee",
  "memo",
  "amount",
]);

export const AccountTypeEnum = z.enum(["checking", "savings", "credit"]);

export const CsvMapperSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  bank: z.string().min(1),
  accountType: AccountTypeEnum,
  csvSignature: z.string().min(1),
  metaLineStart: z.number().int().min(1),
  metaLineEnd: z.number().int().min(1),
  headerRow: z.number().int().min(1),
  dataStartRow: z.number().int().min(1),
  accountMetaLine: z.number().int().min(1),
  delimiter: z.string().nullable(),
  columnMap: z.record(z.string(), z.string()),
  dateFormat: z.string().nullable(),
  invertAmount: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const CreateCsvMapperSchema = z.object({
  name: z.string().min(1),
  bank: z.string().min(1),
  accountType: AccountTypeEnum,
  csvSignature: z.string().min(1),
  metaLineStart: z.number().int().min(1),
  metaLineEnd: z.number().int().min(1),
  headerRow: z.number().int().min(1),
  dataStartRow: z.number().int().min(1),
  accountMetaLine: z.number().int().min(1),
  delimiter: z.string().optional(),
  columnMap: z.record(z.string(), z.string()),
  dateFormat: z.string().optional(),
  invertAmount: z.boolean().default(false),
});

export type CsvMapper = z.infer<typeof CsvMapperSchema>;
export type CreateCsvMapper = z.infer<typeof CreateCsvMapperSchema>;
