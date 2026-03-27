import { z } from "zod/v4";

export const AccountTypeEnum = z.enum(["checking", "savings", "credit"]);

export const AccountSchema = z.object({
  id: z.uuid(),
  bankId: z.uuid(),
  name: z.string().min(1),
  accountNumber: z.string().nullable(),
  type: AccountTypeEnum,
  currency: z.string().length(3),
  csvSignature: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const CreateAccountSchema = z.object({
  bankId: z.uuid(),
  name: z.string().min(1),
  accountNumber: z.string().optional(),
  type: AccountTypeEnum,
  currency: z.string().length(3).default("AUD"),
});

export type Account = z.infer<typeof AccountSchema>;
export type CreateAccount = z.infer<typeof CreateAccountSchema>;
