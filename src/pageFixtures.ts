import { PageSchema, type PageNode } from "./pageSpec";
let count = 0;
const id = () => "00000000-0000-4000-8000-" + String(++count).padStart(12, "0");
const node = (
  type: PageNode["type"],
  fields: Partial<PageNode> = {},
): PageNode => ({
  id: id(),
  type,
  style: {
    gap: "medium",
    padding:
      type === "section" ? "large" : type === "button" ? "small" : "none",
    align: "start",
    tone: "plain",
    width: "full",
  },
  effects: [],
  ...fields,
});
const heading = (content: string, level: 1 | 2 | 3 = 2) =>
  node("heading", { content, level });
const text = (content: string) => node("paragraph", { content });
const cards = node("grid", {
  columns: 3,
  effects: [
    {
      effectId: "stagger-reveal",
      duration: 450,
      delay: 0,
      distance: 12,
      stagger: 70,
    },
  ],
  children: [
    ["表達想法", "用文字與區塊，整理你想呈現的內容。"],
    ["安排布局", "讓相關的資訊靠在一起，保留閱讀空間。"],
    ["調整細節", "在不同尺寸下，確認每個重點都清楚。"],
  ].map(([title, body]) =>
    node("card", {
      style: {
        gap: "medium",
        padding: "large",
        align: "start",
        tone: "soft",
        width: "full",
      },
      effects: [
        {
          effectId: "hover-lift",
          duration: 300,
          delay: 0,
          distance: 8,
          stagger: 70,
        },
      ],
      children: [heading(title, 3), text(body)],
    }),
  ),
});
const heroHeading = heading("把想法，排成一個頁面。", 1);
heroHeading.effects = [
  { effectId: "slide-up", duration: 500, delay: 0, distance: 16, stagger: 70 },
];
const image = node("image", {
  src: "/assets/workspace.svg",
  alt: "網站工作台的布局示意",
  effects: [
    {
      effectId: "scale-in",
      duration: 500,
      delay: 0,
      distance: 12,
      stagger: 70,
    },
  ],
});
const detail = node("section", {
  children: [
    node("container", {
      children: [heading("從內容開始，讓布局跟上。"), cards],
    }),
  ],
});
const button = node("button", {
  content: "查看內容",
  href: "#" + detail.id,
  effects: [
    {
      effectId: "hover-glow",
      duration: 250,
      delay: 0,
      distance: 12,
      stagger: 70,
    },
  ],
});
const hero = node("section", {
  children: [
    node("container", {
      children: [
        node("grid", {
          columns: 2,
          children: [
            node("stack", {
              children: [
                heroHeading,
                text(
                  "這是用來驗證排版、互動與動畫的固定範例。你的草稿不會被修改。",
                ),
                button,
              ],
            }),
            image,
          ],
        }),
      ],
    }),
  ],
  effects: [
    { effectId: "fade-in", duration: 450, delay: 0, distance: 12, stagger: 70 },
  ],
});
export const demoPage = PageSchema.parse({
  schemaVersion: 2,
  metadata: { title: "設計工作台範例", language: "zh-Hant" },
  sections: [
    hero,
    detail,
    node("section", {
      children: [
        node("container", {
          children: [
            heading("繼續探索"),
            node("button", {
              content: "閱讀網頁開發文件",
              href: "https://learn.microsoft.com/zh-tw/training/",
            }),
          ],
        }),
      ],
    }),
  ],
  typography: "sans",
  styles: "neutral",
  responsive: { mobileColumns: 1, desktopColumns: 3 },
});
