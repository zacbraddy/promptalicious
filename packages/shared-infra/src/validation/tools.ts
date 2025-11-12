import { z } from "zod";

export const updateToolSchema = z.object({
  description: z.string().min(1, "Description cannot be empty").optional(),
  enabled: z.boolean().optional(),
});

export type UpdateToolData = z.infer<typeof updateToolSchema>;
