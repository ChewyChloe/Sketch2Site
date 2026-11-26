import { toJSONSchema, z } from "zod";

// Batch notes: the user leaves short notes on several parts of the site, then sends them at
// once. Notes the local reader understands are handled for free; the rest go to the model in
// ONE request. The model may only answer with (a) new wording for that element's own text and
// (b) commands picked from the list offered for that element. Both are then applied through
// the same local reader and patch checks as a typed note, so nothing else can change.

export const noteKinds = ["heading", "paragraph", "button", "card", "image", "form", "media", "other"] as const;
export type NoteKind = (typeof noteKinds)[number];
/** Elements whose own text the model may reword, with the longest wording it may return. */
export const noteTextLimits: Partial<Record<NoteKind, number>> = { heading: 60, paragraph: 400, button: 20 };

const short = z.string().trim().max(20);
export const NoteEditRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    notes: z
      .array(
        z
          .object({
            n: z.number().int().min(1).max(20),
            kind: z.enum(noteKinds),
            // A short preview of the element's current text ("" for pictures and media).
            text: z.string().max(400),
            note: z.string().trim().min(1).max(300),
            // Commands the local reader understands for this element; the model may only pick from these.
            allowed: z.array(z.string().trim().min(1).max(20)).max(16),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    audience: short.optional(),
    purpose: short.optional(),
    mood: short.optional(),
  })
  .strict();
export type NoteEditRequest = z.infer<typeof NoteEditRequestSchema>;

export const NoteEditOutputSchema = z
  .object({
    results: z
      .array(
        z
          .object({
            n: z.number().int().min(1).max(20),
            // "" when the text should stay as it is.
            newText: z.string().max(400),
            commands: z.array(z.string().max(20)).max(4),
          })
          .strict(),
      )
      .max(12),
  })
  .strict();
export const noteEditJSONSchema = toJSONSchema(NoteEditOutputSchema, { target: "draft-7" });

export type NoteEdit = { n: number; newText?: string; commands: string[] };
export const NoteEditResponseSchema = z
  .object({
    requestId: z.string().uuid(),
    results: z.array(z.object({ n: z.number().int(), newText: z.string().max(400).optional(), commands: z.array(z.string().max(20)).max(4) }).strict()).max(12),
  })
  .strict();

/**
 * Keeps only what the model may do: notes that were asked about, commands from that note's
 * own list, and plain new wording (no links, markup or control characters) for elements
 * that have text, within that element's length limit.
 */
export function cleanNoteEdits(request: NoteEditRequest, results: readonly unknown[]): NoteEdit[] {
  const byN = new Map(request.notes.map((x) => [x.n, x]));
  const out: NoteEdit[] = [];
  for (const raw of results) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as { n?: unknown; newText?: unknown; commands?: unknown };
    const note = typeof r.n === "number" ? byN.get(r.n) : undefined;
    if (!note || out.some((o) => o.n === note.n)) continue;
    const commands = Array.isArray(r.commands) ? [...new Set(r.commands.filter((c): c is string => typeof c === "string" && note.allowed.includes(c)))].slice(0, 4) : [];
    let newText: string | undefined;
    const limit = noteTextLimits[note.kind];
    if (limit && note.text.trim() && typeof r.newText === "string") {
      let v = r.newText.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();
      if (note.kind === "heading" || note.kind === "button") v = v.replace(/\s*\n+\s*/g, " ");
      const bad = !v || v.length > limit || /https?:|www\.|[<>{}「」『』“”"]|javascript:/i.test(v) || v === note.text.trim();
      if (!bad) newText = v;
    }
    if (newText || commands.length) out.push({ n: note.n, ...(newText ? { newText } : {}), commands });
  }
  return out;
}
