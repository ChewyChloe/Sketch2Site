import { z } from "zod";

export const ArtPlanSchema = z.object({
  textSpan: z.number().int().min(3).max(9),
  measure: z.number().int().min(18).max(42),
  imagePosition: z.enum(["below", "beside", "overlap"]),
  imageFit: z.enum(["cover", "contain"]),
  imageFocusX: z.number().int().min(0).max(100),
  imageFocusY: z.number().int().min(0).max(100),
  rhythm: z.enum(["compact", "open"]),
  headline: z.enum(["inherit", "display"]),
}).strict();

export type ArtPlan = z.infer<typeof ArtPlanSchema>;
