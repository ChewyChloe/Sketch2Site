import { describe, expect, it } from "vitest";
import { starterDrafts } from "./starters";
import { builtInAssets } from "./assetRef";

describe("starter templates", () => {
  it("give every picture a sample photo, so no template shows a grey placeholder", () => {
    for (const draft of starterDrafts()) {
      const images = draft.nodes.filter((n) => n.type === "image");
      expect(images.length, draft.metadata.name).toBeGreaterThan(0);
      for (const img of images) expect(builtInAssets as readonly string[], `${draft.metadata.name}: ${img.content}`).toContain(img.assetId);
    }
  });
});
