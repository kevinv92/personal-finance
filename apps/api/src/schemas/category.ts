import { z } from "zod/v4";

export const CategorySchema = z.object({
  id: z.string().uuid(),
  schemeId: z.string().uuid(),
  name: z.string().min(1),
  parentId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const CreateCategorySchema = z.object({
  schemeId: z.string().uuid(),
  name: z.string().min(1),
  parentId: z.string().uuid().optional(),
});

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
