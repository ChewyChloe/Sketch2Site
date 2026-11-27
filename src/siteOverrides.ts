import { z } from "zod";
import { themeIds } from "./pageSpec";
import { SectionLayoutSchema } from "./sectionLayout";
import { MotionSchema } from "./motion";

// Site overrides kept in the draft: layout tweaks made on the generated site,
// keyed by a stable anchor (see siteSync.ts), re-applied after each generation.
const StyleOverride = z
  .object({
    gap: z.enum(["none", "small", "medium", "large"]).optional(),
    padding: z.enum(["none", "small", "medium", "large"]).optional(),
    align: z.enum(["start", "center", "end"]).optional(),
    tone: z.enum(["plain", "soft", "accent"]).optional(),
    width: z.enum(["full", "content", "narrow"]).optional(),
  })
  .strict();
const keyPattern = /^(n|[a-z]{3,12}):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:\d{1,2})?$/;
export const SiteOverridesSchema = z
  .object({
    theme: z.enum(themeIds).optional(),
    items: z
      .record(
        z.string().regex(keyPattern),
        z
          .object({
            level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
            columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
            style: StyleOverride.optional(),
            sectionLayout: SectionLayoutSchema.optional(),
            effects: z.array(MotionSchema).max(3).optional(),
          })
          .strict(),
      )
      .refine((items) => Object.keys(items).length <= 300, "網站設定過多"),
  })
  .strict();
export type SiteOverrides = z.infer<typeof SiteOverridesSchema>;
