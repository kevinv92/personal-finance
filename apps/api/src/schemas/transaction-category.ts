import { z } from "zod/v4";

export const TransactionCategorySchema = z.object({
  id: z.string().uuid(),
  transactionId: z.string().uuid(),
  categoryId: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export const CreateTransactionCategorySchema = z.object({
  transactionId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export type TransactionCategory = z.infer<typeof TransactionCategorySchema>;
export type CreateTransactionCategory = z.infer<
  typeof CreateTransactionCategorySchema
>;
