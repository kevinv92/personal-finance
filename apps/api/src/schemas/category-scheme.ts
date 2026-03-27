import { z } from "zod/v4";

export const CategorySchemeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const CreateCategorySchemeSchema = z.object({
  name: z.string().min(1),
});

export type CategoryScheme = z.infer<typeof CategorySchemeSchema>;
export type CreateCategoryScheme = z.infer<typeof CreateCategorySchemeSchema>;
