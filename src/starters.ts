import { blank, CanvasSchema, type CanvasSpec } from "./spec";
import { createBlock, type BlockTemplateId } from "./blockTemplates";
import type { builtInAssets } from "./assetRef";

// Starter templates for the home page: block templates with sample copy for a
// campus or everyday use case. They are clearly sample content to replace.
type Starter = { name: string; blocks: BlockTemplateId[]; copy: string[][]; heroImage?: (typeof builtInAssets)[number] };

const starters: Starter[] = [
  {
    name: "巷口咖啡小店",
    heroImage: "/assets/samples/cafe.jpg",
    blocks: ["hero", "features", "pricing", "cta"],
    copy: [
      ["每天一杯，剛剛好的手沖咖啡", "學校後門走路三分鐘，週一到週六早上八點開門。", "看今日菜單", "店內照片"],
      ["我們的堅持", "自家烘豆\n每週烘焙，豆子不放超過兩週。", "安靜座位\n插座與長桌，適合讀書。", "學生優惠\n出示學生證，飲品九折。"],
      ["飲品價目", "經典美式\nNT$ 70 / 杯\n淺焙或深焙可選。", "拿鐵\nNT$ 90 / 杯\n可換燕麥奶。", "季節手沖\nNT$ 120 / 杯\n每月更換產區。"],
      ["今天就來坐坐", "地址與營業時間都在菜單頁。", "查看位置"],
    ],
  },
  {
    name: "社團招生頁",
    heroImage: "/assets/samples/camera.jpg",
    blocks: ["hero", "gallery", "faq", "cta"],
    copy: [
      ["攝影社，新學期招生中", "不用有相機，手機也能拍出好照片。每週三晚上社團活動。", "立即報名", "社課照片"],
      ["上學期作品", "外拍作品一", "外拍作品二", "期末展覽"],
      ["新生常見問題", "沒有相機可以參加嗎？\n可以，社團有器材可借。", "社費怎麼算？\n一學期 300 元，含外拍交通。", "每週要花多少時間？\n社課兩小時，外拍自由參加。"],
      ["一起拍下這學期", "報名表三分鐘填完，我們會在社群通知你。", "填寫報名表"],
    ],
  },
  {
    name: "課程專題展示",
    blocks: ["hero", "features", "gallery", "cta"],
    copy: [
      ["圖書館座位即時預測", "用課堂學到的資料分析，預測期末週的空位時段，幫同學少跑一趟。", "看專題成果", "專題成果圖"],
      ["我們做了什麼", "收集資料\n兩週記錄五層樓的座位使用情況。", "建立模型\n依時段與考試週預測人數。", "製作介面\n一頁看完各樓層的建議時段。"],
      ["專題畫面", "預測結果頁", "資料收集表", "期末簡報"],
      ["想看完整報告？", "歡迎來信交流，或在課程網站下載簡報。", "下載簡報"],
    ],
  },
];

export function starterDrafts(): CanvasSpec[] {
  return starters.map((starter) => {
    const base = blank();
    let spec: CanvasSpec = { ...base, metadata: { ...base.metadata, name: starter.name, layoutMode: "reflow" } };
    starter.blocks.forEach((id, i) => {
      const block = createBlock(spec, id);
      if (!block) return;
      const lines = starter.copy[i] ?? [];
      const nodes = block.nodes.map((n, j) => ({
        ...n,
        ...(lines[j] ? { content: lines[j] } : {}),
        ...(id === "hero" && n.type === "image" && starter.heroImage ? { assetId: starter.heroImage } : {}),
      }));
      spec = { ...spec, metadata: { ...spec.metadata, height: block.height }, nodes: [...spec.nodes, ...nodes] };
    });
    return CanvasSchema.parse(spec);
  });
}
