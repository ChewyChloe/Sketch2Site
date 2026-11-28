import { z } from "zod";
import { allSections, type PageNode, type PageSpec } from "./pageSpec";
import type { CriticFinding, CriticResult } from "./visualCritic";

// Visual Critic, AI pass. The free local critic (visualCritic.ts) measures proportions; this one
// lets a vision model look at a picture of the page as drawn and judge it like an art director.
// The model may only name problems from a fixed list and pick a target from the page's own
// parts; trusted code turns each choice into an ordinary set-style patch. Locked sections are
// never touched, nothing is rewritten, and the fixes are applied once, in one undo step.

export const criticIssues = ["crowded", "too-sparse", "line-too-long", "flat-rhythm", "weak-contrast", "misaligned", "weak-focus", "action-hidden"] as const;
export const criticFixes = ["more-gap", "less-gap", "more-padding", "less-padding", "narrow-text", "change-tone", "accent-tone", "align-start", "align-center", "none"] as const;

export const CriticAnswerSchema = z.object({
  overall: z.string().trim().min(2).max(60),
  findings: z.array(z.object({
    issue: z.enum(criticIssues),
    targetId: z.string().max(80),
    fix: z.enum(criticFixes),
    why: z.string().trim().min(2).max(50),
  }).strict()).max(5),
}).strict();
export type CriticAnswer = z.infer<typeof CriticAnswerSchema>;

export const CriticRequestSchema = z.object({
  requestId: z.string().uuid(),
  image: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/).max(1_200_000),
  page: z.unknown(),
}).strict();

export const issueTitle: Record<(typeof criticIssues)[number], string> = {
  crowded: "太擠", "too-sparse": "太空", "line-too-long": "一行太長", "flat-rhythm": "段落節奏太平",
  "weak-contrast": "對比不夠", misaligned: "沒有對齊", "weak-focus": "第一眼沒有重點", "action-hidden": "行動按鈕不明顯",
};

const fixPayload: Record<Exclude<(typeof criticFixes)[number], "none">, (n: PageNode) => Record<string, string> | null> = {
  "more-gap": () => ({ gap: "large" }),
  "less-gap": () => ({ gap: "small" }),
  "more-padding": () => ({ padding: "large" }),
  "less-padding": () => ({ padding: "small" }),
  "narrow-text": (n) => (n.type === "paragraph" || n.type === "stack" ? { width: "narrow" } : null),
  "change-tone": (n) => ({ tone: n.style.tone === "soft" ? "plain" : "soft" }),
  "accent-tone": (n) => (n.type === "button" || n.type === "section" ? { tone: "accent" } : null),
  "align-start": () => ({ align: "start" }),
  "align-center": () => ({ align: "center" }),
};

/** The parts the model may point at: sections and their direct content, by id, with a few words. */
export function criticOutline(page: PageSpec) {
  const out: { id: string; kind: string; text?: string }[] = [];
  const walk = (n: PageNode, depth: number) => {
    if (out.length >= 80) return;
    out.push({ id: n.id, kind: n.role ? `${n.type}:${n.role}` : n.type, ...(n.content ? { text: n.content.slice(0, 24) } : {}) });
    if (depth < 3) n.children?.forEach((c) => walk(c, depth + 1));
  };
  page.sections.forEach((s) => walk(s, 0));
  return out;
}

/** Turns the model's choices into findings and set-style patches the page can take. */
export function criticResultFrom(page: PageSpec, answer: CriticAnswer): CriticResult {
  const nodes = new Map<string, PageNode>(), sectionOf = new Map<string, PageNode>();
  allSections(page).forEach((s) => { const mark = (n: PageNode) => { nodes.set(n.id, n); sectionOf.set(n.id, s); n.children?.forEach(mark); }; mark(s); });
  const findings: CriticFinding[] = [];
  const patches: CriticResult["patches"] = [];
  const seen = new Set<string>();
  for (const f of answer.findings) {
    const n = nodes.get(f.targetId);
    if (!n || seen.has(f.issue + n.id)) continue;
    seen.add(f.issue + n.id);
    const locked = !!sectionOf.get(n.id)?.lock;
    const payload = f.fix === "none" || locked ? null : fixPayload[f.fix](n);
    const changes = payload && Object.entries(payload).some(([k, v]) => (n.style as Record<string, string>)[k] !== v) ? payload : null;
    if (changes) {
      const existing = patches.find((p) => p.targetId === n.id);
      if (existing) Object.assign(existing.payload, changes);
      else patches.push({ operation: "set-style", targetId: n.id, payload: { ...changes } });
    }
    findings.push({ id: "ai:" + f.issue + ":" + n.id, title: issueTitle[f.issue], why: f.why, targetId: n.id, fixed: !!changes });
  }
  return { findings, patches };
}
