// Offline metadata only: never loads .env, instantiates a Provider or calls an API.
import { createHash } from "node:crypto";
import { generationFixtures } from "../tests/fixtures/generation";
import { prepareIntent } from "../src/generation";
import { inputTokenBound } from "../server/provider";

const ids = ["portfolio", "event", "product", "irregular", "animated"];
const manifest = generationFixtures().map((canvas, index) => ({
  fixtureId: ids[index],
  name: canvas.metadata.name,
  sha256: createHash("sha256").update(JSON.stringify(canvas)).digest("hex"),
  elements: canvas.nodes.length,
  animations: canvas.nodes.reduce((count, node) => count + node.effects.length, 0),
  inputTokenReservation: inputTokenBound(prepareIntent(canvas)),
  maxOutputTokens: 4096,
}));
process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
