import { expect, it } from "vitest";
import { blank, createNode } from "./spec";
import { materialize, verifyPreservation } from "./generation";
import { smartLayout } from "./smartLayout";
import { retrieveDesignCases } from "./designRetrieval";
import type { ArtPlan } from "./artPlan";

const composition: ArtPlan = {
  textSpan: 5,
  measure: 26,
  imagePosition: "overlap",
  imageFit: "contain",
  imageFocusX: 40,
  imageFocusY: 65,
  rhythm: "open",
  headline: "display",
};

it.each([0, 1, 3])("materializes a validated composition with %i images", count => {
  const canvas = blank();
  canvas.metadata.layoutMode = "reflow";
  canvas.nodes = [createNode("heading", 60, 80)];
  for (let i = 0; i < count; i += 1) canvas.nodes.push(createNode("image", 80 + i * 200, 180));
  const plan = smartLayout(canvas);
  plan.sections[0].artPlan = composition;
  const page = materialize(canvas, plan);
  expect(page.sections[0].children?.[0].artPlan).toEqual({
    ...composition,
    imagePosition: count === 1 ? "overlap" : "below",
  });
  expect(() => verifyPreservation(canvas, page)).not.toThrow();
  canvas.nodes[0].locked = true;
  expect(materialize(canvas, plan).sections[0].children?.[0].artPlan).toBeUndefined();
});

it("excludes incompatible and explicitly rejected case guidance", () => {
  const text = retrieveDesignCases({ images: 0, hasVideo: false });
  expect(text.length).toBeGreaterThan(0);
  expect(text.every(record => record.material === "text")).toBe(true);
  expect(retrieveDesignCases({ images: 0, hasVideo: false, avoid: [text[0].id] }))
    .not.toContainEqual(text[0]);
});
