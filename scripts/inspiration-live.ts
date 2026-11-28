// Real web-inspiration run, one step per invocation, each step at most once (local ledger, no retry).
//   npx tsx scripts/inspiration-live.ts search    -> 1 paid call (keywords + OpenAI web_search)
//   npx tsx scripts/inspiration-live.ts capture   -> free (robots.txt check + local screenshots)
//   npx tsx scripts/inspiration-live.ts analyse   -> 1 paid call (vision analysis of the captures)
import { existsSync } from "node:fs";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import OpenAI from "openai";
import { searchInspiration, analyseInspiration } from "../server/inspirationProvider";
import { captureWithPlaywright } from "../server/inspirationCapture";
import { hintsFrom, pickBoard, type InspirationQuery } from "../src/inspiration";

const root = "outputs/inspiration-live";
await mkdir(root, { recursive: true });
const step = process.argv[2];
const query: InspirationQuery = { purpose: "社區咖啡店網站", audience: "學生與附近居民", mood: "溫暖、安靜、有手作感", note: "手沖咖啡、自家烘豆、適合讀書的座位", avoid: ["連鎖品牌", "外送平台"] };
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "", maxRetries: 0 });
const once = async (name: string) => {
  if (existsSync(`${root}/${name}.ledger.json`)) { console.log(JSON.stringify({ status: "ALREADY_ATTEMPTED_NO_RETRY", step: name })); process.exit(1); }
  const f = await open(`${root}/${name}.ledger.json`, "wx", 0o600);
  await f.writeFile(JSON.stringify({ status: "RESERVED", at: new Date().toISOString() })); await f.close();
};
if (step === "search") {
  await once("search");
  try {
    const r = await searchInspiration(client, query, AbortSignal.timeout(90000));
    await writeFile(`${root}/search.json`, JSON.stringify({ query, ...r }, null, 2));
    console.log(JSON.stringify({ status: "PASS", keywords: r.keywords, cases: r.cases.map((c) => c.url), cited: r.cited, dropped: r.dropped, searchCalls: r.searchCalls, inputTokens: r.inputTokens, outputTokens: r.outputTokens, reasoningTokens: r.reasoningTokens }, null, 2));
  } catch (e) { console.log(JSON.stringify({ status: "FAILED_NO_RETRY", reason: String(e).slice(0, 300) })); process.exitCode = 1; }
}
if (step === "capture") {
  const s = JSON.parse(await readFile(`${root}/search.json`, "utf8"));
  const out = [];
  for (const c of s.cases.slice(0, 6)) {
    const cap = await captureWithPlaywright(c.url);
    if ("jpeg" in cap) { const file = `${root}/case-${out.length + 1}.jpg`; await writeFile(file, Buffer.from(cap.jpeg.split(",")[1], "base64")); out.push({ ...c, file }); }
    else out.push({ ...c, skipped: cap.skipped });
    console.log(c.url, "jpeg" in cap ? "captured" : cap.skipped);
  }
  await writeFile(`${root}/captures.json`, JSON.stringify(out, null, 2));
}
if (step === "analyse") {
  const caps = JSON.parse(await readFile(`${root}/captures.json`, "utf8")).filter((c: { file?: string }) => c.file);
  await once("analyse");
  try {
    const images = await Promise.all(caps.map(async (c: { file: string }, i: number) => ({ n: i + 1, jpeg: "data:image/jpeg;base64," + (await readFile(c.file)).toString("base64") })));
    const r = await analyseInspiration(client, images, query, AbortSignal.timeout(90000));
    const board = pickBoard(r.cases);
    const hosts = Object.fromEntries(caps.map((c: { host: string }, i: number) => [i + 1, c.host]));
    const hints = hintsFrom(board, {}, hosts);
    await writeFile(`${root}/analysis.json`, JSON.stringify({ ...r, board: board.map((b) => b.n), hints }, null, 2));
    console.log(JSON.stringify({ status: "PASS", board: board.map((b) => ({ n: b.n, host: hosts[b.n], relevance: b.relevance, pattern: b.pattern })), hints, inputTokens: r.inputTokens, outputTokens: r.outputTokens }, null, 2));
  } catch (e) { console.log(JSON.stringify({ status: "FAILED_NO_RETRY", reason: String(e).slice(0, 300) })); process.exitCode = 1; }
}
