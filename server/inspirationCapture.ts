import { robotsAllows, safeUrl } from "../src/inspiration";

// Screenshots of the found pages (MengTo/Skills stitched-full-page-capture, MIT, adapted):
// warm the page by scrolling once so lazy media and reveals mount, go back to the top, then
// take settled viewport shots (about 2 s after each scroll) and stitch them. Only the first two
// screens are kept: enough to read composition, type and space, small enough to send.
// Before any capture the site's robots.txt is read; a page disallowed for all agents is skipped.
// One page per site, public home or gallery pages only, nothing is stored on the server.

export type Capture = { url: string; jpeg: string } | { url: string; skipped: "robots" | "unreachable" | "blank" | "unsafe" };

async function allowed(url: URL, fetchImpl: typeof fetch) {
  try {
    const r = await fetchImpl(new URL("/robots.txt", url.origin), { signal: AbortSignal.timeout(8000), redirect: "follow" });
    if (!r.ok) return true; // no robots.txt: nothing disallowed
    return robotsAllows((await r.text()).slice(0, 50000), url.pathname);
  } catch {
    return true;
  }
}

/** A public name that resolves to a private or local address is refused (no reaching the local network). */
export function privateAddress(ip: string) {
  const v4 = ip.replace(/^::ffff:/, "");
  return /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(v4) || /^(::1?$|f[cd]|fe80)/i.test(ip);
}
async function publicHost(host: string) {
  try {
    const { lookup } = await import("node:dns/promises");
    const all = await lookup(host, { all: true });
    return all.length > 0 && all.every((a) => !privateAddress(a.address));
  } catch {
    return false;
  }
}

/** Local development: Playwright Chromium in this environment. */
export async function captureWithPlaywright(raw: string, fetchImpl: typeof fetch = fetch): Promise<Capture> {
  const url = safeUrl(raw);
  if (!url) return { url: raw, skipped: "unsafe" };
  if (!process.env.HTTPS_PROXY && !(await publicHost(url.hostname))) return { url: raw, skipped: "unsafe" };
  if (!(await allowed(url, fetchImpl))) return { url: raw, skipped: "robots" };
  const { chromium } = await import("playwright");
  // Use the environment's outbound proxy when there is one (the browser does not read HTTPS_PROXY itself).
  const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    try {
      await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 25000 });
    } catch {
      return { url: raw, skipped: "unreachable" };
    }
    // Warm: scroll through once so lazy content and reveals mount, then back to the top.
    await page.evaluate(async () => {
      for (let y = 0; y < Math.min(document.body.scrollHeight, 6000); y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); }
      window.scrollTo(0, 0);
    });
    const shots: Buffer[] = [];
    for (const y of [0, 850]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(2000);
      shots.push(await page.screenshot({ type: "png" }));
    }
    // Stitch and shrink in the browser (no image library); reject a nearly blank result.
    const out = await page.evaluate(async (pngs) => {
      const imgs = await Promise.all(pngs.map((b64) => new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = "data:image/png;base64," + b64; })));
      const w = 768, scale = w / imgs[0].width, h = Math.round(imgs.reduce((n, i) => n + i.height, 0) * scale);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d")!; let y = 0;
      for (const i of imgs) { ctx.drawImage(i, 0, y, w, i.height * scale); y += i.height * scale; }
      const d = ctx.getImageData(0, 0, w, h).data; let sum = 0, sq = 0, n = 0;
      for (let k = 0; k < d.length; k += 64) { const v = (d[k] + d[k + 1] + d[k + 2]) / 3; sum += v; sq += v * v; n++; }
      const sd = Math.sqrt(sq / n - (sum / n) ** 2);
      return { jpeg: c.toDataURL("image/jpeg", 0.72), sd };
    }, shots.map((b) => b.toString("base64")));
    if (out.sd < 6) return { url: raw, skipped: "blank" };
    return { url: url.toString(), jpeg: out.jpeg };
  } finally {
    await browser.close();
  }
}

/**
 * Production (Cloudflare Pages has no browser): Cloudflare Browser Rendering REST API.
 * Needs CF_ACCOUNT_ID and a token with Browser Rendering permission (CF_BROWSER_TOKEN).
 */
export async function captureWithBrowserRendering(raw: string, env: { CF_ACCOUNT_ID?: string; CF_BROWSER_TOKEN?: string }, fetchImpl: typeof fetch = fetch): Promise<Capture> {
  const url = safeUrl(raw);
  if (!url) return { url: raw, skipped: "unsafe" };
  if (!env.CF_ACCOUNT_ID || !env.CF_BROWSER_TOKEN) return { url: raw, skipped: "unreachable" };
  if (!(await allowed(url, fetchImpl))) return { url: raw, skipped: "robots" };
  const r = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CF_ACCOUNT_ID)}/browser-rendering/screenshot`, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: { Authorization: `Bearer ${env.CF_BROWSER_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: url.toString(), viewport: { width: 1440, height: 1750 }, gotoOptions: { waitUntil: "networkidle2", timeout: 25000 }, screenshotOptions: { type: "jpeg", quality: 60 } }),
  });
  if (!r.ok || !(r.headers.get("content-type") ?? "").includes("image")) return { url: raw, skipped: "unreachable" };
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length < 4000) return { url: raw, skipped: "blank" };
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { url: url.toString(), jpeg: "data:image/jpeg;base64," + btoa(bin) };
}
