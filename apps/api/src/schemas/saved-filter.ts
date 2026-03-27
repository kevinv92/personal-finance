import { z } from "zod/v4";

const RelativeDateCondition = z.object({
  field: z.literal("date"),
  operator: z.literal("relative"),
  value: z.enum([
    "last7days",
    "last30days",
    "lastMonth",
    "thisMonth",
    "lastQuarter",
    "thisQuarter",
    "lastYear",
    "thisYear",
  ]),
});

const DateRangeCondition = z.object({
  field: z.literal("date"),
  operator: z.literal("between"),
  value: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
  }),
});

const TextCondition = z.object({
  field: z.enum(["payee", "memo"]),
  operator: z.enum([
    "contains",
    "equals",
    "startsWith",
    "notContains",
    "notEquals",
  ]),
  value: z.array(z.string().min(1)).min(1),
});

const SelectCondition = z.object({
  field: z.enum(["categoryName", "bankName", "accountName"]),
  operator: z.enum(["equals", "in", "notEquals", "notIn"]),
  value: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
});

const AmountCondition = z.object({
  field: z.literal("amount"),
  operator: z.enum(["gt", "lt", "between"]),
  value: z.union([z.number(), z.object({ min: z.number(), max: z.number() })]),
});

export const FilterConditionSchema = z.discriminatedUnion("field", [
  RelativeDateCondition,
  DateRangeCondition,
  TextCondition,
  SelectCondition,
  AmountCondition,
]);

export const SavedFilterSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  conditions: z.array(FilterConditionSchema),
  createdAt: z.iso.datetime(),
});

export const CreateSavedFilterSchema = z.object({
  name: z.string().min(1),
  conditions: z.array(FilterConditionSchema).min(1),
});

export type FilterCondition = z.infer<typeof FilterConditionSchema>;
export type SavedFilter = z.infer<typeof SavedFilterSchema>;
export type CreateSavedFilter = z.infer<typeof CreateSavedFilterSchema>;
