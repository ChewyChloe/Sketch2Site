import { readdir, readFile } from "node:fs/promises";
const marker = "SKETCH2SITE_TEST_SECRET_83f21c";
async function scan(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = dir + "/" + e.name;
    if (e.isDirectory()) await scan(p);
    else {
      const s = await readFile(p, "utf8");
      if (
        s.includes("You are a responsive single-page layout planner") ||
        s.includes(marker) ||
        /sk-(?:proj-)?[A-Za-z0-9_-]{24,}/.test(s)
      )
        throw Error("Secret detected in " + p);
      if (p.endsWith(".map")) throw Error("Unexpected source map");
    }
  }
}
await scan("dist");
console.log(
  "PASS: test secret absent; no source maps or recognizable API keys",
);
