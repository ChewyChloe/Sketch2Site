// @vitest-environment jsdom
import { it, expect, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import Preview from "./Preview";
import { demoPage } from "./pageFixtures";
import { indexNodes } from "./patch";
afterEach(cleanup);
it("selects an ID, applies a patch through the form and safely rejects invalid text", async () => {
  render(<Preview />);
  const target = Array.from(indexNodes(demoPage).values()).find(
    (n) => n.type === "heading",
  )!;
  fireEvent.click(screen.getByRole("heading", { name: target.content! }));
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
  fireEvent.click(screen.getByRole("button", { name: "套用" }));
  expect(screen.getByRole("heading", { name: "我的作品集" })).toBeTruthy();
  expect(screen.getByText("已套用，其他元素資料未變更。")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "撤銷修改" }));
  expect(screen.getByRole("heading", { name: target.content! })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "重做修改" }));
  expect(screen.getByRole("heading", { name: "我的作品集" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("標題文字"), {
    target: { value: "<script>alert(1)</script>" },
  });
  fireEvent.click(screen.getByRole("button", { name: "套用" }));
  expect(screen.getByRole("alert").textContent).toContain("修改格式或數值無效");
  expect(screen.getByRole("heading", { name: "我的作品集" })).toBeTruthy();
  expect(indexNodes(demoPage).get(target.id)?.content).toBe(target.content);
});
