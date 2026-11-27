// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import Preview from "./Preview";
import { demoPage } from "./pageFixtures";
import { indexNodes } from "./patch";
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.stubGlobal("IntersectionObserver", Observer);
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("selects an ID, applies a patch through the form and safely rejects invalid text", async () => {
  render(<Preview />);
  const target = Array.from(indexNodes(demoPage).values()).find(
    (n) => n.type === "heading",
  )!;
  const heading = await screen.findByRole("heading", { name: target.content! });
  await act(async () => {}); // Flush restored-session effects before the first interaction.
  fireEvent.click(heading);
  await waitFor(() =>
    expect(
      (screen.getByLabelText("標題文字") as HTMLTextAreaElement).value,
    ).toBe(target.content),
  );
  expect(
    screen
      .getByRole("heading", { name: target.content! })
      .getAttribute("data-page-selected"),
  ).toBe("true");
  fireEvent.change(screen.getByLabelText("標題文字"), {
    target: { value: "我的作品集" },
  });
  fireEvent.click(screen.getByRole("tab", { name: "動畫" }));
  fireEvent.click(screen.getByRole("button", { name: "淡入" }));
  fireEvent.click(screen.getByRole("tab", { name: "屬性" }));
  expect((screen.getByLabelText("標題文字") as HTMLTextAreaElement).value).toBe(
    "我的作品集",
  );
  fireEvent.click(screen.getByRole("button", { name: "套用" }));
  expect(screen.getByRole("heading", { name: "我的作品集" })).toBeTruthy();
  expect(screen.getByText("已套用")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "撤銷修改" }));
  expect(screen.getByRole("heading", { name: target.content! })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "重做修改" }));
  expect(screen.getByRole("heading", { name: "我的作品集" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("標題文字"), {
    target: { value: "<script>alert(1)</script>" },
  });
  fireEvent.click(screen.getByRole("button", { name: "套用" }));
  expect(screen.getByRole("alert").textContent).toContain("數值不對");
  expect(screen.getByRole("heading", { name: "我的作品集" })).toBeTruthy();
  expect(screen.getByTestId("page-save-status").textContent).toBe("尚未套用");
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const paragraph = Array.from(indexNodes(demoPage).values()).find(
    (n) => n.type === "paragraph",
  )!;
  fireEvent.click(screen.getByText(paragraph.content!));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(
    (screen.getByLabelText("標題文字") as HTMLTextAreaElement).value,
  ).toContain("<script>");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText("標題文字")).toBeTruthy();
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "捨棄修改" }));
  expect((screen.getByLabelText("標題文字") as HTMLTextAreaElement).value).toBe(
    "我的作品集",
  );
  expect(screen.queryByRole("button", { name: "捨棄修改" })).toBeNull();
  expect(indexNodes(demoPage).get(target.id)?.content).toBe(target.content);
}, 20000);
