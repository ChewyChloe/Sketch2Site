import { z } from "zod";

// The art direction data (artDirection.ts applies it). No imports from the page schema.
export const heroMotions = ["fade-in", "blur-in", "slide-up", "split-line-assembly", "letter-assembly", "character-decode"] as const;
export const headingMotions = ["fade-in", "slide-up", "blur-in", "hand-drawn-highlight", "accent-stroke"] as const;
export const actionMotions = ["hover-lift", "press-feedback", "shine-sweep", "magnetic-control"] as const;
export const imageMotions = ["dolly-frame", "color-wake", "image-reveal", "blur-in"] as const;

export const ArtDirectionSchema = z.object({
  thesis: z.string().trim().min(2).max(40),
  typeSystem: z.enum(["editorial-serif", "grotesk", "mono-accent", "quiet-sans"]),
  space: z.enum(["tight", "balanced", "generous"]),
  imagery: z.enum(["full-bleed", "framed", "rounded", "contained"]),
  signature: z.enum(["rule-lines", "oversized-numbers", "edge-type", "offset-captions", "none"]),
  accent: z.enum(["one-accent", "monochrome"]),
  motion: z.object({
    hero: z.enum(heroMotions).nullable(),
    headings: z.enum(headingMotions).nullable(),
    actions: z.enum(actionMotions).nullable(),
    images: z.enum(imageMotions).nullable(),
  }).strict(),
}).strict();
export type ArtDirection = z.infer<typeof ArtDirectionSchema>;

export const artLabels = {
  typeSystem: { "editorial-serif": "襯線雜誌標題", grotesk: "緊湊黑體大字", "mono-accent": "等寬字點綴", "quiet-sans": "安靜黑體" },
  space: { tight: "緊湊", balanced: "適中", generous: "大量留白" },
  imagery: { "full-bleed": "照片滿版", framed: "照片留邊框", rounded: "圓角照片", contained: "照片完整不裁" },
  signature: { "rule-lines": "細線分隔", "oversized-numbers": "超大編號", "edge-type": "字貼邊裁切", "offset-captions": "錯位圖說", none: "不加特殊手法" },
  accent: { "one-accent": "只用一個強調色", monochrome: "單色" },
} as const;

