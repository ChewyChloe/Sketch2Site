// One real AI Visual Critic call on a real candidate (paid; never retried; local ledger).
// Input: outputs/critic-live/before-snapshot.jpg made by scripts/critic-snapshot.cjs.
import { existsSync } from "node:fs";
import { open, readFile, writeFile } from "node:fs/promises";
import OpenAI from "openai";
import { PageSchema } from "../src/pageSpec";
import { createPageSession, applyPatchBatch } from "../src/patch";
import { criticResultFrom, CriticAnswerSchema } from "../src/visualCriticAi";
import { critiqueScreenshot } from "../server/criticProvider";
import { lunaUsageUsd } from "../server/lunaPolicy";

const root = "outputs/critic-live";
if (existsSync(`${root}/paid-once.json`) || existsSync(`${root}/answer.json`)) { console.log(JSON.stringify({ status: "ALREADY_ATTEMPTED_NO_RETRY" })); process.exit(1); }
const page = PageSchema.parse(JSON.parse(await readFile(process.argv[2] ?? "outputs/art-direction-live/candidate-1.json", "utf8")));
const image = "data:image/jpeg;base64," + (await readFile(`${root}/before-snapshot.jpg`)).toString("base64");
const ledger = await open(`${root}/paid-once.json`, "wx", 0o600);
await ledger.writeFile(JSON.stringify({ status: "RESERVED", at: new Date().toISOString() })); await ledger.close();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 90000 });
const started = Date.now();
try {
  const r = await critiqueScreenshot(client, image, page, AbortSignal.timeout(90000));
  // Save the paid answer first, so nothing paid for is lost if a later step fails.
  await writeFile(`${root}/answer.json`, JSON.stringify({ answer: r.answer, inputTokens: r.inputTokens, outputTokens: r.outputTokens, cachedInputTokens: r.cachedInputTokens, reasoningTokens: r.reasoningTokens }, null, 2));
  const answer = CriticAnswerSchema.parse(r.answer);
  const result = criticResultFrom(page, answer);
  const session = createPageSession(page);
  const applied = result.patches.length ? applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: session.revision, patches: result.patches }, result.patches.map((p) => p.targetId)) : null;
  if (applied && !applied.ok) throw Error("patch rejected: " + applied.code);
  if (applied?.ok) await writeFile(`${root}/after.json`, JSON.stringify(applied.state.history.present));
  const usage = { inputTokens: r.inputTokens, outputTokens: r.outputTokens, cachedInputTokens: r.cachedInputTokens, reasoningTokens: r.reasoningTokens, costUsd: lunaUsageUsd(r), latencyMs: Date.now() - started };
  const report = { status: "LIVE_CRITIC_PASS", answer, findings: result.findings, patches: result.patches, applied: !!applied?.ok, undoable: !!applied?.ok, usage, retries: 0 };
  await writeFile(`${root}/result.json`, JSON.stringify(report, null, 2));
  await writeFile(`${root}/paid-once.json`, JSON.stringify({ status: "DONE", usage }));
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  await writeFile(`${root}/paid-once.json`, JSON.stringify({ status: "FAILED", error: String(e).slice(0, 200) }));
  console.log(JSON.stringify({ status: "FAILED", error: String(e).slice(0, 300) }));
  process.exit(1);
}
