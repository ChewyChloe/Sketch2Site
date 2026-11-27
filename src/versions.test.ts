import { describe, expect, it } from "vitest";
import { sectionLabel } from "./versions";
import { onlySections } from "./CompareView";
import { PageSchema } from "./pageSpec";

const style = () => ({ gap: "medium", padding: "medium", align: "start", tone: "plain", width: "full" }) as const;
const id = () => crypto.randomUUID();
const page = PageSchema.parse({ schemaVersion: 2, metadata: { title: "小島", language: "zh-Hant" }, typography: "sans", styles: "neutral", responsive: { mobileColumns: 1, desktopColumns: 1 },
  sections: ["報名方式", "我們的堅持與自家烘焙的理由"].map((h) => ({ id: id(), type: "section", style: style(), effects: [], children: [{ id: id(), type: "heading", level: 2, content: h, style: style(), effects: [] }] })) });

describe("version labels and comparison scope", () => {
  it("names a notes version after the section it changed", () => {
    expect(sectionLabel(page, [page.sections[0].id])).toBe("修改「報名方式」區塊");
    expect(sectionLabel(page, [page.sections[1].id])).toBe("修改「我們的堅持與自家烘焙…」區塊");
    expect(sectionLabel(page, page.sections.map((s) => s.id))).toBe("修改「報名方式」區塊等 2 區");
    expect(sectionLabel(page, [])).toBe("修改網站");
  });
  it("compares only the touched sections, or the whole page when none are named", () => {
    expect(onlySections(page, [page.sections[1].id]).sections.map((s) => s.id)).toEqual([page.sections[1].id]);
    expect(onlySections(page)).toBe(page);
    expect(onlySections(page, [id()])).toBe(page);
  });
});
