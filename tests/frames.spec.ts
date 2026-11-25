import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

async function dropPhoto(page: Page, target: Locator) {
  const b64 = readFileSync("public/assets/samples/cafe.jpg").toString("base64");
  const dt = await page.evaluateHandle((data) => {
    const bin = atob(data), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const t = new DataTransfer();
    t.items.add(new File([arr], "cafe.jpg", { type: "image/jpeg" }));
    return t;
  }, b64);
  await target.dispatchEvent("drop", { dataTransfer: dt });
}

// Frames: pick a shape, drop a photo in, adjust crop and look, and keep it on the site.
test("frames hold photos with crop and adjustments, in the draft and on the site", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/\/api\/generation\/(status|ready)$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ configured: false }) }));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("草稿已就緒");
  await page.getByRole("button", { name: "新增區塊：首屏介紹" }).click();
  await page.getByRole("button", { name: "新增相框：愛心" }).click();
  const heart = page.getByTestId("canvas-node").filter({ has: page.locator('[data-frame="heart"]') });
  await expect(heart).toHaveCount(1);
  // An empty frame invites a photo.
  await expect(heart.getByRole("img")).toHaveAccessibleName(/尚未放入圖片/);
  await dropPhoto(page, heart);
  await expect(page.getByText("圖片已匯入，僅存於本機。").first()).toBeVisible();
  await expect(heart.locator(".page-frame-photo img")).toBeVisible();
  // Double-click to crop: zoom in, nudge with the keyboard, apply with Enter.
  await heart.dblclick();
  const crop = page.getByRole("group", { name: "調整照片裁切" });
  await expect(crop).toBeVisible();
  await page.getByLabel("照片縮放").fill("2");
  await crop.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(crop).toHaveCount(0);
  await expect(heart.locator(".page-frame-photo")).toHaveAttribute("style", /scale\(2, 2\)/);
  // Filter, flip and frame swap from the inspector; each is undoable.
  await page.getByRole("button", { name: "黑白", exact: true }).click();
  await expect(heart.locator(".page-frame-photo")).toHaveAttribute("style", /grayscale\(1\)/);
  await page.getByRole("button", { name: "左右翻轉" }).click();
  await expect(heart.locator(".page-frame-photo")).toHaveAttribute("style", /scale\(-2, 2\)/);
  await page.getByRole("button", { name: "相框：花瓣", exact: true }).click();
  const flower = page.getByTestId("canvas-node").filter({ has: page.locator('[data-frame="flower"]') });
  await expect(flower).toHaveCount(1);
  await page.locator(".canvas-tools").getByRole("button", { name: "還原", exact: true }).click();
  await expect(page.getByTestId("canvas-node").filter({ has: page.locator('[data-frame="heart"]') })).toHaveCount(1);
  // Escape leaves crop mode without changes.
  await heart.dblclick();
  await page.getByLabel("照片縮放").fill("3");
  await page.getByRole("group", { name: "調整照片裁切" }).press("Escape");
  await expect(heart.locator(".page-frame-photo")).toHaveAttribute("style", /scale\(-2, 2\)/);
  // The site keeps frame, crop and look; annotations can change the frame there.
  await page.getByRole("button", { name: "生成網站", exact: true }).click();
  await page.getByRole("button", { name: "使用此版本" }).click();
  const frame = page.getByTestId("preview-frame");
  const siteHeart = frame.locator('[data-frame="heart"]');
  await expect(siteHeart.locator("img")).toBeVisible();
  await expect(siteHeart.locator(".page-frame-photo")).toHaveAttribute("style", /grayscale\(1\)/);
  await siteHeart.click();
  await page.getByRole("button", { name: /註解：說說這個圖片要怎麼改/ }).click();
  const bubble = page.getByRole("dialog", { name: /註解：修改這個圖片/ });
  await bubble.getByLabel("想怎麼改這個元件").fill("換成圓形框，拿掉濾鏡");
  await bubble.getByRole("button", { name: "改", exact: true }).click();
  await expect(frame.locator('[data-frame="circle"] img')).toBeVisible();
  // The change flows back to the draft.
  await page.getByRole("button", { name: "草稿", exact: true }).click();
  await expect(page.getByTestId("canvas-node").filter({ has: page.locator('[data-frame="circle"]') })).toHaveCount(1);
  // Clearing keeps the shape, ready for another photo.
  await page.getByTestId("canvas-node").filter({ has: page.locator('[data-frame="circle"]') }).click();
  await page.getByRole("button", { name: "清空相框" }).click();
  await expect(page.getByTestId("canvas-node").filter({ has: page.locator('[data-frame="circle"]') }).getByRole("img")).toHaveAccessibleName(/尚未放入圖片/);
  expect(errors).toEqual([]);
});
