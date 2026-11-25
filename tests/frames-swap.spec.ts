import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

async function dropPhoto(page: Page, target: Locator, file: string) {
  const b64 = readFileSync(file).toString("base64");
  const dt = await page.evaluateHandle((data) => {
    const bin = atob(data), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const t = new DataTransfer();
    t.items.add(new File([arr], "photo.jpg", { type: "image/jpeg" }));
    return t;
  }, b64);
  await target.dispatchEvent("drop", { dataTransfer: dt });
}

// Like Canva: drag a framed photo onto another frame to swap, and auto-focus the crop.
test("swap photos between frames by dragging, and smart crop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增相框：圓形" }).click();
  await page.getByRole("button", { name: "新增相框：愛心" }).click();
  const circle = page.getByTestId("canvas-node").filter({ has: page.locator('[data-frame="circle"]') });
  const heart = page.getByTestId("canvas-node").filter({ has: page.locator('[data-frame="heart"]') });
  await dropPhoto(page, circle, "public/assets/samples/cafe.jpg");
  await expect(circle.locator("img")).toBeVisible();
  // Smart crop moves the focus and zooms a little; it is one undo step.
  await circle.click();
  await page.getByRole("button", { name: "自動對準重點" }).click();
  await expect(page.getByText("已對準照片重點").first()).toBeVisible();
  await expect(circle.locator(".page-frame-photo")).toHaveAttribute("style", /scale\(1\.15, 1\.15\)/);
  // Drag the circle's photo onto the empty heart: the photo moves into the heart.
  const before = (await circle.boundingBox())!, target = (await heart.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
  await expect(heart).toHaveAttribute("data-swap-target", "");
  await page.mouse.up();
  await expect(heart.locator("img")).toBeVisible();
  await expect(circle.getByRole("img")).toHaveAccessibleName(/尚未放入圖片/);
  // The circle stayed where it was.
  expect((await circle.boundingBox())!.x).toBeCloseTo(before.x, 0);
  await page.locator(".canvas-tools").getByRole("button", { name: "還原", exact: true }).click();
  await expect(circle.locator("img")).toBeVisible();
  expect(errors).toEqual([]);
});
