import { z } from "zod/v4";

export const TransactionSchema = z.object({
  id: z.uuid(),
  accountId: z.uuid(),
  externalId: z.string().nullable(),
  date: z.iso.date(),
  dateProcessed: z.iso.date().nullable(),
  type: z.string().nullable(),
  payee: z.string().min(1),
  memo: z.string().nullable(),
  amount: z.number(),
  createdAt: z.iso.datetime(),
});

export const CreateTransactionSchema = z.object({
  accountId: z.uuid(),
  externalId: z.string().optional(),
  date: z.iso.date(),
  dateProcessed: z.iso.date().optional(),
  type: z.string().optional(),
  payee: z.string().min(1),
  memo: z.string().optional(),
  amount: z.number(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
