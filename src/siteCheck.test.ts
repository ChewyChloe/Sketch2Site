import { describe, expect, it } from "vitest";
import { checkSite, contrastRatio, issueSummary } from "./siteCheck";
import { PageSchema, type PageSpec } from "./pageSpec";

const style = () => ({ gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full" }) as const;
const id = () => crypto.randomUUID();
function page(children: Record<string, unknown>[], title = "小島咖啡"): PageSpec {
  return PageSchema.parse({ schemaVersion: 2, metadata: { title, language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 1 },
    sections: [{ id: id(), type: "section", style: style(), effects: [], children: children.map((c) => ({ id: id(), style: style(), effects: [], ...c })) }] });
}
const titles = (p: PageSpec) => checkSite(p).map((i) => i.title);

describe("pre-launch check on page data", () => {
  it("a finished page passes", () => {
    const ok = page([{ type: "heading", level: 1, content: "小島咖啡，每天現烘" }, { type: "image", src: "/assets/samples/cafe.jpg", alt: "店裡的吧台" }, { type: "button", content: "預約座位", href: "https://booking.island-coffee.tw/" }]);
    expect(checkSite(ok)).toEqual([]);
    expect(issueSummary([])).toBe("沒有發現問題，可以上線");
  });
  it("finds the problems a non-designer misses", () => {
    const bad = page([
      { type: "heading", level: 2, content: "例如：輸入你的標題" },
      { type: "image", src: "/assets/samples/cafe.jpg", alt: "照片" },
      { type: "button", content: "報名", href: "https://example.com/" },
      { type: "paragraph", content: "很長".repeat(200) },
    ], "未命名草稿");
    const t = titles(bad);
    for (const want of ["網站名稱還沒取", "沒有主標題", "還有範本文字沒改", "圖片沒有說明文字", "按鈕連到範例網址", "段落太長"]) expect(t).toContain(want);
    const errors = checkSite(bad).filter((i) => i.level === "error");
    expect(errors.every((i) => i.advice.length > 6)).toBe(true);
    expect(issueSummary(checkSite(bad))).toMatch(/個要修正/);
    // Element issues point at the element.
    expect(checkSite(bad).find((i) => i.title === "圖片沒有說明文字")!.targetId).toBe(bad.sections[0].children![1].id);
  });
});

describe("contrast", () => {
  it("matches the WCAG formula", () => {
    expect(contrastRatio("rgb(0, 0, 0)", "rgb(255, 255, 255)")).toBeCloseTo(21, 0);
    expect(contrastRatio("rgb(119, 119, 119)", "rgb(255, 255, 255)")).toBeCloseTo(4.48, 1);
    expect(contrastRatio("nope", "rgb(0,0,0)")).toBeNull();
  });
});
