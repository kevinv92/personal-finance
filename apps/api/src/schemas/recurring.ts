import { z } from "zod/v4";

export const FrequencyEnum = z.enum([
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "annual",
]);

export const RecurringSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  matchKey: z.string().nullable(),
  expectedAmount: z.number().nullable(),
  frequency: FrequencyEnum,
  categoryId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const CreateRecurringSchema = z.object({
  name: z.string().min(1),
  matchKey: z.string().optional(),
  expectedAmount: z.number().optional(),
  frequency: FrequencyEnum,
  categoryId: z.uuid().optional(),
});

export const UpdateRecurringSchema = z.object({
  name: z.string().min(1).optional(),
  expectedAmount: z.number().nullable().optional(),
  frequency: FrequencyEnum.optional(),
  categoryId: z.uuid().nullable().optional(),
});

export type Recurring = z.infer<typeof RecurringSchema>;
export type CreateRecurring = z.infer<typeof CreateRecurringSchema>;
export type UpdateRecurring = z.infer<typeof UpdateRecurringSchema>;
