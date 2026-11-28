// One real generation with art direction, composable composition, web-inspiration hints and taste.
// Free token count first; one paid call; never retried (local ledger). Writes outputs/art-direction-live/.
import { existsSync } from "node:fs";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import { starterDrafts } from "../src/starters";
import { prepareIntent, materialize, verifyPreservation } from "../src/generation";
import { PageSchema } from "../src/pageSpec";
import { openAIProvider, validUsage } from "../server/provider";
import { LUNA_MODEL, reserveLunaMicros, lunaUsageUsd } from "../server/lunaPolicy";
import { directionsFor, applyDirection } from "../src/directions";

const root = "outputs/art-direction-live";
await mkdir(root, { recursive: true });
if (existsSync(`${root}/paid-once.json`)) { console.log(JSON.stringify({ status: "ALREADY_ATTEMPTED_NO_RETRY" })); process.exit(1); }
const canvas = starterDrafts().find((x) => /咖啡/.test(x.metadata.name))!;
const hints = JSON.parse(await readFile("outputs/inspiration-live/analysis.json", "utf8")).hints;
canvas.metadata.brief = { audience: "學生與附近居民", purpose: "社區咖啡店網站", mood: "溫暖安靜", focus: "手沖咖啡", note: "自家烘豆、適合讀書的座位", inspiration: hints, taste: ["常選的構圖：窄文接寬圖", "喜歡較窄、好讀的文字欄"] };
const intent = prepareIntent(canvas);
const provider = openAIProvider(process.env.OPENAI_API_KEY ?? "", LUNA_MODEL);
const report: Record<string, unknown> = { model: LUNA_MODEL, retries: 0 };
try {
  const inputTokens = await provider.countInputTokens!(intent, AbortSignal.timeout(20000));
  const reserve = reserveLunaMicros(inputTokens);
  Object.assign(report, { inputTokensCounted: inputTokens, reservedUsd: reserve / 1e6 });
  if (reserve > 20000) throw Error("Budget limit");
  const ledger = await open(`${root}/paid-once.json`, "wx", 0o600);
  await ledger.writeFile(JSON.stringify({ status: "RESERVED", reservedMicros: reserve, at: new Date().toISOString() })); await ledger.close();
  const result = await provider.generate(intent, AbortSignal.timeout(120000));
  if (!validUsage(result)) throw Error("Invalid usage");
  const page = PageSchema.parse(materialize(canvas, result.layout));
  verifyPreservation(canvas, page);
  const ds = (result.layout as { directions?: unknown[] }).directions ? directionsFor(page) : directionsFor(page);
  const aiDirections = (result.layout as { directions?: typeof ds }).directions ?? null;
  const directions = aiDirections ?? ds;
  await writeFile(`${root}/canvas.json`, JSON.stringify(canvas, null, 2));
  await writeFile(`${root}/page.json`, JSON.stringify(page, null, 2));
  await writeFile(`${root}/directions.json`, JSON.stringify({ fromAI: !!aiDirections, directions }, null, 2));
  directions.forEach((d, i) => void writeFile(`${root}/candidate-${i + 1}.json`, JSON.stringify(applyDirection(page, d, undefined))));
  Object.assign(report, { status: "LIVE_PROVIDER_PASS", directionsFromAI: !!aiDirections, usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens, cachedInputTokens: result.cachedInputTokens ?? null, reasoningTokens: result.reasoningTokens ?? null, costUsd: lunaUsageUsd(result) }, directions: directions.map((d) => ({ name: d.name, plan: d.plan, compose: d.compose, art: d.art })) });
} catch (e) {
  report.status = existsSync(`${root}/paid-once.json`) ? "LIVE_FAILED_NO_RETRY" : "BLOCKED_BEFORE_PAYMENT";
  report.reason = String(e).slice(0, 300);
  process.exitCode = 1;
}
await writeFile(`${root}/result.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
