import { z } from "zod/v4";

export const TransactionCategorySchema = z.object({
  id: z.uuid(),
  transactionId: z.uuid(),
  categoryId: z.uuid(),
  createdAt: z.iso.datetime(),
});

export const CreateTransactionCategorySchema = z.object({
  transactionId: z.uuid(),
  categoryId: z.uuid(),
});

export type TransactionCategory = z.infer<typeof TransactionCategorySchema>;
export type CreateTransactionCategory = z.infer<
  typeof CreateTransactionCategorySchema
>;
