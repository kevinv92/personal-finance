import { z } from "zod/v4";

export const MatchFieldEnum = z.enum(["payee", "memo", "both"]);
export const MatchTypeEnum = z.enum(["contains", "exact", "startsWith"]);

export const CategoryRuleSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  matchField: MatchFieldEnum,
  matchType: MatchTypeEnum,
  matchValues: z.array(z.string().min(1)).min(1),
  sortOrder: z.number().int(),
  createdAt: z.iso.datetime(),
});

export const CreateCategoryRuleSchema = z.object({
  categoryId: z.uuid(),
  matchField: MatchFieldEnum,
  matchType: MatchTypeEnum,
  matchValues: z.array(z.string().min(1)).min(1),
});

export type CategoryRule = z.infer<typeof CategoryRuleSchema>;
export type CreateCategoryRule = z.infer<typeof CreateCategoryRuleSchema>;
