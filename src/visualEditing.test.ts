import { expect, it } from "vitest";
import { bounds, contains, localPoint } from "./visualEditing";
import { demoPage } from "./pageFixtures";
import { effectCompatible, PageSchema } from "./pageSpec";
import {
  applyPatchBatch,
  createPageSession,
  indexNodes,
  travelPage,
} from "./patch";
it("maps scaled/scrolled client coordinates and uses full containment in either drag direction", () => {
  expect(
    localPoint(
      { x: 150, y: 260 },
      { x: 100, y: 200, width: 400, height: 300 },
      800,
      600,
    ),
  ).toEqual({ x: 100, y: 120 });
  expect(
    bounds([
      { x: 50, y: 60 },
      { x: 10, y: 20 },
    ]),
  ).toEqual({ x: 10, y: 20, width: 40, height: 40 });
  const box = { x: 10, y: 20, width: 40, height: 40 };
  expect(contains(box, { x: 10, y: 20, width: 10, height: 10 })).toBe(true);
  expect(contains(box, { x: 5, y: 20, width: 10, height: 10 })).toBe(false);
  expect(contains(box, { x: 20, y: 20, width: 0, height: 0 })).toBe(false);
});
it("rejects stagger on leaves through the existing schema and Patch engine; legal changes travel atomically", () => {
  const session = createPageSession(demoPage),
    nodes = [...indexNodes(demoPage).values()];
  const heading = nodes.find((n) => n.type === "heading")!;
  expect(effectCompatible(heading, "stagger-reveal")).toBe(false);
  const batch = (effectId: string) => ({
    schemaVersion: 1,
    sessionId: session.sessionId,
    baseRevision: session.revision,
    patches: [
      {
        operation: "attach-effect",
        targetId: heading.id,
        payload: { effectId },
      },
    ],
  });
  const rejected = applyPatchBatch(session, batch("stagger-reveal"), [
    heading.id,
  ]);
  expect(rejected.ok).toBe(false);
  expect(rejected.state).toBe(session);
  expect(
    applyPatchBatch(session, batch("javascript:alert(1)"), [heading.id]).ok,
  ).toBe(false);
  expect(applyPatchBatch(session, batch("fade-in"), []).ok).toBe(false);
  const accepted = applyPatchBatch(session, batch("fade-in"), [heading.id]);
  expect(accepted.ok).toBe(true);
  if (!accepted.ok) return;
  expect(PageSchema.safeParse(accepted.state.history.present).success).toBe(
    true,
  );
  const undo = travelPage(accepted.state, "undo");
  expect(undo.history.present).toEqual(demoPage);
  expect(travelPage(undo, "redo").history.present).toEqual(
    accepted.state.history.present,
  );
});
