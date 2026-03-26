import { z } from "zod/v4";

export const CategorySchemeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export const CreateCategorySchemeSchema = z.object({
  name: z.string().min(1),
});

export type CategoryScheme = z.infer<typeof CategorySchemeSchema>;
export type CreateCategoryScheme = z.infer<typeof CreateCategorySchemeSchema>;
