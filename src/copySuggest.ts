import { toJSONSchema, z } from "zod";

// AI copy suggestions: only on request, for one piece of text, returning a few
// alternatives the user may pick. Nothing changes until the user picks one.

export const copyKinds = ["heading", "paragraph", "button"] as const;
export type CopyKind = (typeof copyKinds)[number];
export const copyLimits: Record<CopyKind, number> = { heading: 40, paragraph: 200, button: 16 };

const short = z.string().trim().max(20);
export const CopyRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    kind: z.enum(copyKinds),
    text: z.string().trim().min(1).max(400),
    audience: short.optional(),
    purpose: short.optional(),
    mood: short.optional(),
  })
  .strict();
export type CopyRequest = z.infer<typeof CopyRequestSchema>;

export const CopyOutputSchema = z.object({ options: z.array(z.string().max(400)).min(1).max(3) }).strict();
export const copyJSONSchema = toJSONSchema(CopyOutputSchema, { target: "draft-7" });

export const CopyResponseSchema = z
  .object({
    requestId: z.string().uuid(),
    options: z.array(z.string().min(1).max(200)).min(1).max(3),
  })
  .strict();

/**
 * Keeps only safe, plain-text options of the right length that differ from the
 * original: no links, markup, braces or control characters; one line for headings
 * and buttons.
 */
export function cleanOptions(kind: CopyKind, original: string, options: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const raw of options) {
    if (typeof raw !== "string") continue;
    let v = raw.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();
    if (kind !== "paragraph") v = v.replace(/\s*\n+\s*/g, " ");
    if (!v || v.length > copyLimits[kind]) continue;
    if (/https?:|www\.|[<>{}]|javascript:/i.test(v)) continue;
    // Same words with only punctuation or spacing changed is not a real alternative.
    const bare = (x: string) => x.replace(/[\s\p{P}]/gu, "");
    if (bare(v) === bare(original) || out.some((o) => bare(o) === bare(v))) continue;
    out.push(v);
  }
  return out.slice(0, 3);
}
