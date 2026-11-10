import { PageSchema } from "../../src/pageSpec";
export const id = (n: number) =>
  `60000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const fixture = PageSchema.parse({
  schemaVersion: 2,
  metadata: { title: "視覺編輯測試範例（非 AI）", language: "zh-Hant" },
  typography: "sans",
  styles: "neutral",
  responsive: { mobileColumns: 1, desktopColumns: 2 },
  sections: [
    {
      id: id(1),
      type: "section",
      children: [
        { id: id(2), type: "heading", content: "我的設計作品", level: 1 },
        {
          id: id(3),
          type: "paragraph",
          content: "用清楚的設計，說明每一個作品。",
        },
        {
          id: id(4),
          type: "card",
          children: [
            { id: id(5), type: "paragraph", content: "專案介紹與成果" },
          ],
        },
        { id: id(6), type: "button", content: "查看作品", href: "#" + id(4) },
      ],
    },
  ],
});
