import { z } from "zod/v4";

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  date: z.string().date(),
  description: z.string().min(1),
  amount: z.number(),
  createdAt: z.string().datetime(),
});

export const CreateTransactionSchema = z.object({
  accountId: z.string().uuid(),
  date: z.string().date(),
  description: z.string().min(1),
  amount: z.number(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
