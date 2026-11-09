import {
  blank,
  createNode,
  CanvasSchema,
  type CanvasSpec,
  type CanvasNode,
} from "../../src/spec";
import type { Layout } from "../../src/generation";
import type { Intent, LayoutProvider } from "../../server/provider";
export function generationFixtures(): CanvasSpec[] {
  let fixtureIndex = 0;
  const build = (
    name: string,
    entries: [CanvasNode["type"], string, number, number, number?][],
  ) => {
    const page = blank();
    page.metadata.name = name;
    const fixtureId = ++fixtureIndex;
    page.nodes = entries.map(([type, content, x, y, width], index) => ({
      ...createNode(type, x, y),
      id: `00000000-0000-4000-8000-${String(fixtureId * 100 + index).padStart(12, "0")}`,
      content,
      ...(width ? { width } : {}),
    }));
    const heading = page.nodes.find((n) => n.type === "heading")!;
    page.nodes.forEach((n) => {
      if (n.type === "button") n.href = "#" + heading.id;
    });
    return CanvasSchema.parse(page);
  };
  const portfolio = build("個人作品集", [
    ["heading", "林的作品集", 80, 60],
    ["text", "我設計簡潔易讀的網站。", 80, 180],
    ["image", "作品布局示意", 800, 180],
    ["card", "作品：閱讀工具", 80, 500],
    ["card", "作品：記錄工具", 450, 500],
    ["button", "回到介紹", 80, 900],
  ]);
  const event = build("活動介紹", [
    ["heading", "社區閱讀日", 80, 80],
    ["text", "時間：週六下午。地點：社區圖書室。", 80, 160],
    ["image", "活動版面示意", 80, 440],
    ["button", "查看活動資訊", 600, 160],
  ]);
  const product = build("產品介紹", [
    ["heading", "桌面筆記工具", 80, 40],
    ["text", "整理每天的想法。", 80, 130],
    ["card", "段落分類", 80, 420],
    ["card", "本機保存", 440, 420],
    ["card", "快速搜尋", 800, 420],
    ["button", "查看介紹", 80, 750],
  ]);
  const irregular = build("不規則草稿", [
    ["text", "說明放在畫布左下。", 10, 1000, 410],
    ["heading", "凌亂的想法", 850, 100, 500],
    ["button", "返回標題", 500, 650],
    ["card", "一張靠右的卡片", 1090, 890, 280],
    ["image", "示意素材", 420, 280],
  ]);
  const animated = build("動畫草稿", [
    ["heading", "緩慢展開的內容", 100, 50],
    ["text", "這段文字使用淡入。", 100, 220],
    ["image", "縮放圖片示意", 800, 220],
    ["card", "卡片內文逐項顯示。", 100, 600],
    ["button", "回到開頭", 850, 600],
  ]);
  animated.nodes[0].effects = ["slide-up"];
  animated.nodes[1].effects = ["fade-in"];
  animated.nodes[2].effects = ["scale-in"];
  animated.nodes[3].effects = ["stagger-reveal", "lift"];
  animated.nodes[4].effects = ["hover-glow"];
  return [portfolio, event, product, irregular, CanvasSchema.parse(animated)];
}
// Test-only planner, never imported by the production API. It is not evidence of AI quality.
export function mockLayout(intent: Intent): Layout {
  return {
    version: 1,
    typography: intent.canvas.constraints.includes("typography:serif")
      ? "serif"
      : "sans",
    theme: "neutral",
    sections: intent.candidateGroups.map((group) => ({
      layout: group.length > 1 ? "grid" : "stack",
      columns: Math.min(group.length, 3) as 1 | 2 | 3,
      gap: "large",
      items: group.map((id) => {
        const node = intent.canvas.nodes.find((n) => n.id === id)!;
        return {
          sourceId: id,
          presentation: node.type === "text" ? "paragraph" : node.type,
          headingLevel: 1,
          width: node.type === "image" ? "narrow" : "full",
          align: "start",
          tone: node.type === "card" ? "soft" : "plain",
        };
      }),
    })),
  };
}
export const mockProvider: LayoutProvider = {
  async generate(intent) {
    return { layout: mockLayout(intent), inputTokens: 250, outputTokens: 400 };
  },
};
