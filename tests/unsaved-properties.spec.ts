import { choose } from "./helpers/select";
import {openWebsiteWorkspace} from "./helpers/workbench";
import { test, expect, type Page } from "@playwright/test";
import { fixture, id } from "./fixtures/workbench";
import { editSelection, pageAction, openPanel } from "./helpers/workbench";
async function setup(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await openWebsiteWorkspace(page);
  await page.getByLabel("載入頁面檔案").setInputFiles({
    name: "unsaved-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  await page.getByRole("button", { name: "選取", exact: true }).click();
  await page.locator(`[data-page-id="${id(2)}"]`).click();
  await editSelection(page);
}
for (const width of [1440, 768, 375])
  test(`pending properties survive cancelled selection/Escape and remain unapplied at ${width}`, async ({
    page,
  }) => {
    await setup(page, width);
    const calls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/")) calls.push(r.url());
    });
    const input = page.getByLabel("標題文字");
    await input.fill("還沒套用的標題");
    await choose(page.getByLabel("元素對齊"), "center");
    await expect(page.getByTestId("page-save-status")).toHaveText("尚未套用");
    await expect(page.locator(`[data-page-id="${id(2)}"]`)).toHaveText(
      "我的設計作品",
    );
    await page
      .locator(".workbench-menu > summary")
      .filter({ hasText: "頁面" })
      .click();
    await expect(
      page.getByRole("button", { name: "匯出 React 專案", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    // Use the component list so this works even when the narrow inspector covers the canvas.
    await openPanel(page, "元件");
    page.once("dialog", (d) => d.dismiss());
    await page.locator(`[data-component-id="${id(3)}"]`).click();
    await editSelection(page);
    await expect(input).toHaveValue("還沒套用的標題");
    await expect(page.getByLabel("元素對齊")).toHaveAttribute("data-value", "center");
    page.once("dialog", (d) => d.dismiss());
    await page.keyboard.press("Escape");
    await expect(input).toHaveValue("還沒套用的標題");
    await expect(page.locator(`[data-page-id="${id(2)}"]`)).toHaveAttribute(
      "data-page-selected",
      "true",
    );
    await page.getByRole("button", { name: "工具", exact: true }).click();
    await expect(input).not.toBeVisible();
    await page.getByRole("button", { name: "工具", exact: true }).click();
    await expect(input).toHaveValue("還沒套用的標題");
    await page.screenshot({
      path: `test-results/unsaved-properties-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "套用", exact: true }).click();
    await expect(page.locator(`[data-page-id="${id(2)}"]`)).toHaveText(
      "還沒套用的標題",
    );
    await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
    await input.fill("明確捨棄這段");
    await page.getByRole("button", { name: "捨棄修改", exact: true }).click();
    await expect(input).toHaveValue("還沒套用的標題");
    await input.fill("取消選取時捨棄");
    page.once("dialog", (d) => d.accept());
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-page-selected]")).toHaveCount(0);
    await pageAction(page, "重新載入頁面");
    await expect(page.locator(`[data-page-id="${id(2)}"]`)).toHaveText(
      "還沒套用的標題",
    );
    expect(calls).toEqual([]);
  });
test("reload, Undo, page replacement and local candidate cannot silently discard pending properties", async ({
  page,
}) => {
  await setup(page);
  const input = page.getByLabel("標題文字");
  await input.fill("已套用的內容");
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  await input.fill("保留這份輸入");
  page.once("dialog", (d) => d.dismiss());
  await pageAction(page, "重新載入頁面");
  await expect(input).toHaveValue("保留這份輸入");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(input).toHaveValue("保留這份輸入");
  page.once("dialog", (d) => d.dismiss());
  await pageAction(page, "還原範例");
  await expect(input).toHaveValue("保留這份輸入");
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  await page.getByRole("button", { name: "新增文字", exact: true }).click();
  await page
    .locator(".workbench-menu > summary")
    .filter({ hasText: "草稿選單" })
    .click();
  await page
    .getByRole("button", { name: "立即排版", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("請先套用或取消");
  await expect(page.getByRole("main", { name: "生成候選預覽" })).toHaveCount(0);
  await openWebsiteWorkspace(page);
  await expect(input).toHaveValue("保留這份輸入");
});

test("mobile editor keeps full-width preview visible, actions reachable and sheet dismissible", async ({
  page,
}) => {
  await setup(page, 375);
  const panel = page.locator("#preview-inspector"),
    canvas = page.locator(".preview-scroll");
  const pb = (await panel.boundingBox())!,
    cb = (await canvas.boundingBox())!;
  expect(pb.x).toBe(0);
  expect(pb.width).toBe(375);
  expect(cb.height).toBeGreaterThan(350);
  expect(cb.y + cb.height).toBeCloseTo(pb.y, 0);
  await page.getByLabel("標題文字").fill("看得見頁面，再修改內容");
  const apply = page.getByRole("button", { name: "套用", exact: true });
  await expect(apply).toBeInViewport();
  await expect(page.getByText("修改尚未套用", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-editor-375.png",
    fullPage: true,
  });
  await apply.click();
  await expect(page.locator(`[data-page-id="${id(2)}"]`)).toHaveText(
    "看得見頁面，再修改內容",
  );
  const link = page.locator(".preview-frame .page-button");
  await link.focus();
  const focused = (await link.boundingBox())!;
  expect(focused.y + focused.height).toBeLessThanOrEqual(cb.y + cb.height + 1);
  await openPanel(page, "動畫");
  await page.screenshot({
    path: "test-results/mobile-animation-sheet-375.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "淡入", exact: true }).click();
  await page.getByRole("button", { name: "關閉工具面板" }).click();
  await expect(panel).not.toBeVisible();
  await expect(page.locator(`[data-page-id="${id(2)}"]`)).toHaveAttribute(
    "data-effects",
    "fade-in",
  );
});

test("browser reload prompts for pending properties, cancellation retains the form", async ({
  page,
}) => {
  await setup(page);
  await page.getByLabel("標題文字").fill("瀏覽器重載仍應保護");
  const dialog = page.waitForEvent("dialog");
  await page.evaluate(() => {
    setTimeout(() => location.reload(), 0);
  });
  const prompt = await dialog;
  expect(prompt.type()).toBe("beforeunload");
  await prompt.dismiss();
  await expect(page.getByLabel("標題文字")).toHaveValue("瀏覽器重載仍應保護");
});

test("invalid, oversized and malformed page files preserve the valid page and pending form", async ({
  page,
}) => {
  await setup(page);
  const input = page.getByLabel("標題文字");
  await input.fill("匯入失敗也要保留");
  const inputs = [
    { name: "broken.json", buffer: Buffer.from("{broken") },
    { name: "large.json", buffer: Buffer.from(" ".repeat(200001)) },
    {
      name: "unsafe.json",
      buffer: Buffer.from(
        JSON.stringify({
          ...fixture,
          sections: [{ id: id(1), type: "script", content: "alert(1)" }],
        }),
      ),
    },
  ];
  for (const file of inputs) {
    await page
      .getByLabel("載入頁面檔案")
      .setInputFiles({ ...file, mimeType: "application/json" });
    await expect(page.getByRole("alert")).toContainText(
      "原頁面與未套用修改已保留",
    );
    await expect(input).toHaveValue("匯入失敗也要保留");
    await expect(page.locator(`[data-page-id="${id(2)}"]`)).toHaveText(
      "我的設計作品",
    );
  }
  await page.getByRole("button", { name: "套用", exact: true }).click();
  await expect(page.locator(`[data-page-id="${id(2)}"]`)).toHaveText(
    "匯入失敗也要保留",
  );
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
});

test("duration-only edits are guarded and accepted Undo/Redo restores committed values", async ({
  page,
}) => {
  await setup(page);
  await openPanel(page, "動畫");
  await page.getByRole("button", { name: "淡入", exact: true }).click();
  await openPanel(page, "屬性");
  const duration = page.getByLabel("動畫時長（毫秒）"),
    original = await duration.inputValue();
  await duration.fill("900");
  await expect(page.getByTestId("page-save-status")).toHaveText("尚未套用");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(duration).toHaveValue("900");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "撤銷修改" }).click();
  await expect(duration).toHaveCount(0);
  await expect(page.getByTestId("page-save-status")).toHaveText("已儲存");
  await page.getByRole("button", { name: "重做修改" }).click();
  await expect(duration).toHaveValue(original);
  await choose(page.getByLabel("元素對齊"), "center");
  await expect(page.getByTestId("page-save-status")).toHaveText("尚未套用");
  await page.getByRole("button", { name: "捨棄修改", exact: true }).click();
  await expect(page.getByLabel("元素對齊")).toHaveAttribute("data-value", "start");
});
