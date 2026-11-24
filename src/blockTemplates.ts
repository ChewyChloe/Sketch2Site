import { canvasMaxHeight, createNode, type CanvasNode, type CanvasSpec } from "./spec";

// Starter sections for the draft canvas. They are ordinary, editable canvas
// nodes (placeholder copy the user replaces), grouped so they move together.
export type BlockTemplateId = "hero" | "features" | "gallery" | "pricing" | "faq" | "contact" | "cta";

type Part = [CanvasNode["type"], string, number, number, number, number];

const templates: Record<BlockTemplateId, { label: string; hint: string; height: number; parts: Part[] }> = {
  hero: {
    label: "首屏介紹",
    hint: "大標題、說明、按鈕與圖片",
    height: 260,
    parts: [
      ["heading", "一句話，說清楚你在做什麼", 80, 0, 560, 96],
      ["text", "寫下給誰看、能得到什麼，例如：每週三晚上，帶新手拍出第一張照片。", 80, 104, 520, 64],
      ["button", "立即了解", 80, 184, 200, 64],
      ["image", "首屏主視覺", 760, 0, 560, 260],
    ],
  },
  features: {
    label: "三欄特色",
    hint: "標題與三張重點卡片",
    height: 230,
    parts: [
      ["heading", "內容重點", 80, 0, 400, 72],
      ["card", "重點一\n寫一件具體的事，例如時間、地點或價格。", 80, 88, 400, 142],
      ["card", "重點二\n一張卡片只講一件事。", 520, 88, 400, 142],
      ["card", "重點三\n用數字或例子代替形容詞。", 960, 88, 400, 142],
    ],
  },
  gallery: {
    label: "圖片展示",
    hint: "標題與三張圖片",
    height: 230,
    parts: [
      ["heading", "照片", 80, 0, 400, 72],
      ["image", "展示圖片一", 80, 88, 400, 142],
      ["image", "展示圖片二", 520, 88, 400, 142],
      ["image", "展示圖片三", 960, 88, 400, 142],
    ],
  },
  pricing: {
    label: "價目表",
    hint: "三個方案與價格",
    height: 300,
    parts: [
      ["heading", "方案與價格", 80, 0, 400, 72],
      ["card", "基本方案\nNT$ 0 / 月\n適合先試試看的個人頁面。", 80, 88, 400, 212],
      ["card", "進階方案\nNT$ 290 / 月\n多頁面與自訂網域。", 520, 88, 400, 212],
      ["card", "團隊方案\nNT$ 990 / 月\n多人協作與優先支援。", 960, 88, 400, 212],
    ],
  },
  faq: {
    label: "常見問題",
    hint: "問題與回答清單",
    height: 340,
    parts: [
      ["heading", "常見問題", 80, 0, 400, 72],
      ["card", "需要會寫程式嗎？\n不需要，拖拉元件就能完成草稿。", 80, 88, 1280, 76],
      ["card", "可以用自己的圖片嗎？\n可以，匯入 PNG 或 JPEG 即可。", 80, 176, 1280, 76],
      ["card", "完成後怎麼上線？\n下載 React 專案後，部署到任何靜態網站服務。", 80, 264, 1280, 76],
    ],
  },
  contact: {
    label: "聯絡表單",
    hint: "標題、說明與留言表單",
    height: 320,
    parts: [
      ["heading", "與我們聯絡", 80, 0, 480, 72],
      ["text", "留下你的問題，我們會盡快回覆。", 80, 88, 480, 64],
      ["form", "姓名\nEmail\n訊息", 640, 0, 640, 320],
    ],
  },
  cta: {
    label: "行動呼籲",
    hint: "收尾標題、說明與按鈕",
    height: 220,
    parts: [
      ["heading", "最後，請訪客做一件事", 80, 0, 560, 80],
      ["text", "例如報名、預約或寄信。按鈕上直接寫要做的動作。", 80, 88, 560, 64],
      ["button", "立即報名", 80, 156, 200, 64],
    ],
  },
};

export const blockTemplateIds = Object.keys(templates) as BlockTemplateId[];
export const blockTemplateInfo = (id: BlockTemplateId) => ({ label: templates[id].label, hint: templates[id].hint });

/**
 * Places the template below the current content. The canvas grows in 600px
 * steps when needed (up to canvasMaxHeight); returns null when it cannot fit.
 */
export function createBlock(spec: CanvasSpec, id: BlockTemplateId): { nodes: CanvasNode[]; height: number } | null {
  const template = templates[id];
  const bottom = spec.nodes.reduce((max, n) => Math.max(max, n.y + n.height), 0);
  const top = spec.nodes.length ? bottom + 24 : 24;
  const needed = top + template.height;
  const height = needed <= spec.metadata.height ? spec.metadata.height : Math.ceil(needed / 600) * 600;
  if (height > canvasMaxHeight || spec.nodes.length + template.parts.length > 100) return null;
  const groupId = crypto.randomUUID();
  const nodes = template.parts.map(([type, content, x, y, width, h]) => ({
    ...createNode(type, x, top + y, height),
    content,
    width,
    height: h,
    groupId,
  }));
  // Template buttons start linked to the block's own heading; the user can change it.
  const heading = nodes.find((n) => n.type === "heading")!;
  for (const n of nodes) if (n.type === "button") n.href = "#" + heading.id;
  return { nodes, height };
}
