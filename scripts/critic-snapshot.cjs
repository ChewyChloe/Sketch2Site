// Renders one page JSON with the dev server (port 5174) at desktop width and saves the picture
// the app itself sends to the AI critic (src/pageSnapshot.ts), plus a real screenshot.
// Usage: node scripts/critic-snapshot.cjs <page.json> <out-prefix>
const { chromium } = require("playwright");
const fs = require("fs");
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:5174/?draft");
  await p.getByRole("status").filter({ hasText: "草稿已就緒" }).waitFor();
  const page = JSON.parse(fs.readFileSync(file, "utf8"));
  await p.evaluate(async (pg) => {
    const RD = await import("/node_modules/.vite/deps/react-dom_client.js"); const createRoot = RD.createRoot ?? RD.default.createRoot;
    const R = await import("/node_modules/.vite/deps/react.js"); const React = R.createElement ? R : R.default;
    const { PageRenderer } = await import("/src/PageRenderer.tsx");
    document.body.innerHTML = "<div id=solo></div>"; document.body.style.margin = "0";
    createRoot(document.getElementById("solo")).render(React.createElement(PageRenderer, { input: pg }));
  }, page);
  await p.waitForTimeout(2500);
  // Let every reveal finish so the picture shows the page as a visitor sees it after scrolling.
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); });
  await p.waitForTimeout(1200);
  const jpeg = await p.evaluate(async () => (await import("/src/pageSnapshot.ts")).pageSnapshot(document.querySelector(".rendered-page")));
  if (!jpeg) throw new Error("snapshot failed");
  fs.writeFileSync(out + "-snapshot.jpg", Buffer.from(jpeg.split(",")[1], "base64"));
  await p.screenshot({ path: out + "-screen.png", fullPage: true });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
