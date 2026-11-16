import { test, expect, type Page } from "@playwright/test";

async function openDraftComponents(page: Page) {
  const expand = page.getByRole("button", { name: "展開側欄", exact: true });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("tab", { name: "元件", exact: true }).click();
}

async function raster(page: Page, format: "png" | "jpeg") {
  return page.evaluate((format) => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 24;
    canvas.getContext("2d")!.fillRect(0, 0, 32, 24);
    return canvas.toDataURL(`image/${format}`).split(",")[1];
  }, format);
}

for (const format of ["png", "jpeg"] as const) {
  test(`real ${format}: selecting the same file twice adds two decoded images`, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    const file = { name: `same.${format}`, mimeType: `image/${format}`, buffer: Buffer.from(await raster(page, format), "base64") };
    for (let count = 1; count <= 2; count++) {
      await openDraftComponents(page);
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "匯入圖片", exact: true }).click();
      await (await chooser).setFiles(file);
      const images = page.getByTestId("canvas-node").locator("img");
      await expect(images).toHaveCount(count);
      await expect.poll(() => images.evaluateAll((nodes) => nodes.every((node) => (node as HTMLImageElement).naturalWidth === 32))).toBe(true);
      await expect(page.getByLabel("匯入圖片檔案")).toHaveValue("");
    }
    const positions = await page.getByTestId("canvas-node").evaluateAll((nodes) =>
      nodes.map((node) => {
        const element = node as HTMLElement;
        return { left: element.style.left, top: element.style.top };
      }),
    );
    expect(positions[0]).not.toEqual(positions[1]);
  });
}

for (const [format, mime] of [["png", ""], ["jpeg", ""], ["png", "image/x-png"], ["jpeg", "image/pjpeg"], ["jpeg", "image/jpg"]] as const) {
  test(`native ${format} MIME ${mime || "missing"} still requires real raster bytes`, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    const base64 = await raster(page, format);
    await page.getByLabel("匯入圖片檔案").evaluate((input: HTMLInputElement, data) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))], `native.${data.format}`, { type: data.mime }));
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, { base64, format, mime });
    const image = page.getByTestId("canvas-node").locator("img");
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(32);
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }]) {
  test(`failed import has visible feedback at ${viewport.width}px and preserves the draft`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("草稿已就緒");
    await openDraftComponents(page);
    await page.getByRole("button", { name: "新增文字", exact: true }).click();
    const before = await page.getByTestId("canvas-node").allTextContents();
    await page.getByLabel("匯入圖片檔案").setInputFiles({ name: "invalid.png", mimeType: "image/png", buffer: Buffer.from("<svg onload='alert(1)'/>") });
    const feedback = page.getByText(/圖片無效/).filter({ visible: true }).first();
    await expect(feedback).toBeVisible();
    await expect(feedback).toBeInViewport();
    expect(await page.getByTestId("canvas-node").allTextContents()).toEqual(before);
    await expect(page.getByTestId("canvas-node").locator("img")).toHaveCount(0);
  });
}
