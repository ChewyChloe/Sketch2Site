import { describe, it, expect } from "vitest";
import { generationFixtures } from "./demoFixtures";
import { createDemoCandidate } from "./demo";
import { verifyPreservation } from "./generation";
import { PageSchema } from "./pageSpec";
describe("explicit free local demonstration", () => {
  it.each(generationFixtures())(
    "preserves $metadata.name without changing the input",
    (canvas) => {
      const original = JSON.stringify(canvas);
      const candidate = createDemoCandidate(canvas);
      expect(candidate.mode).toBe("demo");
      expect(
        candidate.usage.inputTokens +
          candidate.usage.outputTokens +
          candidate.usage.estimatedCostUsd,
      ).toBe(0);
      expect(PageSchema.safeParse(candidate.page).success).toBe(true);
      expect(() => verifyPreservation(canvas, candidate.page)).not.toThrow();
      expect(JSON.stringify(canvas)).toBe(original);
    },
  );
  it("honors explicit layout and typeface constraints", () => {
    const canvas = generationFixtures()[0];
    canvas.constraints = ["layout:stack", "typography:serif"];
    const result = createDemoCandidate(canvas);
    expect(result.page.typography).toBe("serif");
    expect(JSON.stringify(result.page)).not.toContain('"type":"grid"');
  });
});
