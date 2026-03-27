import { z } from "zod/v4";

const CategoryConfigSchema = z.object({
  name: z.string().min(1),
  children: z.array(z.string().min(1)).optional(),
});

const MatchFieldEnum = z.enum(["payee", "memo", "both"]);
const MatchTypeEnum = z.enum(["contains", "exact", "startsWith"]);

const CategoryRuleConfigSchema = z.object({
  matchField: MatchFieldEnum,
  matchType: MatchTypeEnum,
  matchValues: z.array(z.string().min(1)).min(1),
  category: z.string().min(1),
});

export const SeedConfigSchema = z.object({
  categories: z.array(CategoryConfigSchema).optional(),
  categoryRules: z.array(CategoryRuleConfigSchema).optional(),
});

export type SeedConfig = z.infer<typeof SeedConfigSchema>;
export type CategoryConfig = z.infer<typeof CategoryConfigSchema>;
export type CategoryRuleConfig = z.infer<typeof CategoryRuleConfigSchema>;
