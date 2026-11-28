// Prints the SHA-256 Pages checks for a draft (SKETCH_AI_TEST_CANVAS_SHA256), computed exactly as
// server/sitesWorker.ts does. Reads a draft JSON file; makes no network request and costs nothing.
// Usage: npx tsx scripts/draft-hash.ts draft.json
import { readFileSync } from "node:fs";
import { canvasHash } from "../server/sitesWorker";
import { approvalBase } from "../server/sitesDraftPolicy";

const file = process.argv[2];
if (!file) { console.error("用法：npx tsx scripts/draft-hash.ts draft.json"); process.exit(1); }
const canvas = JSON.parse(readFileSync(file, "utf8"));
console.log(await canvasHash(approvalBase(canvas, {} as never)));
