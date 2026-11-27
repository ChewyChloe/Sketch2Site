import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwright = require.resolve("@playwright/test/cli");
const args = process.argv.slice(2);

function run(options) {
  const result = spawnSync(process.execPath, [playwright, "test", ...options], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.signal) process.kill(process.pid, result.signal);
  return result.status ?? 1;
}

if (args.length) {
  process.exitCode = run(args);
} else {
  // Each shard starts a fresh loopback Mock server with its original 32-session limit.
  // Split at test level so large spec files do not consume a whole server's sessions.
  const total = 16;
  for (let shard = 1; shard <= total; shard++) {
    console.log(`\nE2E shard ${shard}/${total}`);
    const status = run([
      "--fully-parallel", "--workers=1", `--shard=${shard}/${total}`,
      `--output=test-results/shard-${shard}`,
    ]);
    if (status) process.exitCode = status;
  }
}
