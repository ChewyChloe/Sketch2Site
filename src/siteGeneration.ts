import { createDemoCandidate, type CandidateResult } from "./demo";
import { GenerationError } from "./generation";
import { PageSchema, allSections, navChrome, type PageNode, type PageSpec } from "./pageSpec";
import { pageDraft, type CanvasSpec } from "./spec";

// Multi-page sites: every page is laid out on its own with the same trusted
// pipeline, then combined. The first page's theme and typography apply to all.
export function createSiteCandidate(canvas: CanvasSpec): CandidateResult {
  const pages = canvas.metadata.pages;
  if (!pages || pages.length < 2) return createDemoCandidate(pageDraft(canvas, pages?.[0]?.id ?? null));
  const start = performance.now();
  const built = pages.map((page) => {
    const sub = pageDraft(canvas, page.id);
    if (!sub.nodes.length) {
      const error = new GenerationError("INVALID_INPUT");
      error.message = `頁面「${page.name}」還沒有內容，請先放入元件或刪除這一頁`;
      throw error;
    }
    // Links to other pages are not resolvable inside one page; park them and restore after layout.
    const local = new Set(sub.nodes.map((n) => n.id));
    const parked = new Map<string, string>();
    const anchor = sub.nodes[0].id;
    const nodes = sub.nodes.map((n) => {
      if (n.type === "button" && n.href?.startsWith("#") && !local.has(n.href.slice(1))) {
        parked.set(n.id, n.href);
        return { ...n, href: "#" + anchor };
      }
      return n;
    });
    const result = createDemoCandidate({ ...sub, nodes }).page;
    const restore = (n: PageNode): PageNode => ({
      ...n,
      ...(parked.has(n.id) ? { href: parked.get(n.id)! } : {}),
      ...(n.children ? { children: n.children.map(restore) } : {}),
    });
    return { page, spec: { ...result, sections: result.sections.map(restore) } as PageSpec };
  });
  const [home, ...rest] = built;
  const site = PageSchema.parse({
    ...home.spec,
    chrome: { ...navChrome(canvas.metadata.nav, true), footer: true },
    home: { id: home.page.id, title: home.page.name },
    subpages: rest.map(({ page, spec }) => ({
      id: page.id,
      title: page.name,
      sections: spec.sections,
      ...(spec.draftLayout ? { draftLayout: spec.draftLayout } : {}),
    })),
  });
  if (allSections(site).length < pages.length) throw new GenerationError("INVALID_OUTPUT");
  return {
    requestId: crypto.randomUUID(),
    page: site,
    mode: "demo",
    usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0, latencyMs: performance.now() - start, estimatedCostUsd: 0 },
  };
}
