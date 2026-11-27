// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
// The app opens on the home page; #draft opens the draft directly (set before App loads).
vi.hoisted(() => { window.history.replaceState(null, "", "/?draft"); });
import App from "./App";
vi.mock("./storage", () => ({
  loadDraft: vi.fn(async () => null),
  saveDraft: vi.fn(async () => {}),
}));
it("鍵盤可用的新增、內容編輯、刪除及還原", async () => {
  render(<App />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "新增文字" }).hasAttribute("disabled"),
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("button", { name: "新增文字" }));
  fireEvent.click(screen.getByRole("tab", { name: "編輯元素" }));
  fireEvent.change(screen.getByRole("textbox", { name: "元素內容" }), {
    target: { value: "安全文字" },
  });
  expect(screen.getByTestId("canvas-node").textContent).toContain("安全文字");
  fireEvent.change(screen.getByRole("spinbutton", {name:"X 位置"}), {target:{value:"2000"}});
  expect(screen.getByRole("status").textContent).toContain("這樣會超出畫布");
  expect(screen.getByTestId("canvas-node").style.left).toBe("80px");
  fireEvent.keyDown(window, { key: "Delete" });
  expect(screen.queryByTestId("canvas-node")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "還原" }));
  expect(screen.getByTestId("canvas-node").textContent).toContain("安全文字");
  cleanup();
});
