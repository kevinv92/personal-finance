import { z } from "zod/v4";

export const CategorySchema = z.object({
  id: z.uuid(),
  schemeId: z.uuid(),
  name: z.string().min(1),
  parentId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});

export const CreateCategorySchema = z.object({
  schemeId: z.uuid(),
  name: z.string().min(1),
  parentId: z.uuid().optional(),
});

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
