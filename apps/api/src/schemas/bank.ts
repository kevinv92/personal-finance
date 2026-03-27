import { z } from "zod/v4";

export const BankSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const CreateBankSchema = z.object({
  name: z.string().min(1),
});

export type Bank = z.infer<typeof BankSchema>;
export type CreateBank = z.infer<typeof CreateBankSchema>;
