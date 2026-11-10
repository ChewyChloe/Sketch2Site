// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WorkbenchMenu } from "./WorkbenchMenu";
import { AnimationLibrary } from "./AnimationLibrary";
afterEach(cleanup);
it("closes secondary menus after actions, outside clicks and Escape with focus restored", () => {
  const action = vi.fn();
  const { container } = render(
    <WorkbenchMenu label="頁面">
      <button onClick={action}>載入頁面</button>
    </WorkbenchMenu>,
  );
  const menu = container.querySelector("details")!,
    summary = container.querySelector("summary")!;
  fireEvent.click(summary);
  expect(menu.open).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "載入頁面" }));
  expect(action).toHaveBeenCalledOnce();
  expect(menu.open).toBe(false);
  fireEvent.click(summary);
  fireEvent.pointerDown(document.body);
  expect(menu.open).toBe(false);
  fireEvent.click(summary);
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(menu.open).toBe(false);
  expect(document.activeElement).toBe(summary);
});
it("shows only the six controlled assets, exposes compatibility and passes only a preset ID to drag handlers", () => {
  const choose = vi.fn(),
    drag = vi.fn();
  const { container } = render(
    <AnimationLibrary
      compatibility={(id) => (id === "stagger-reveal" ? "僅適用於容器" : null)}
      onChoose={choose}
      onDragStart={drag}
    />,
  );
  expect(container.querySelectorAll("[data-effect-id]")).toHaveLength(6);
  expect(
    (screen.getByRole("button", { name: "依序顯示" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "淡入" }));
  expect(choose).toHaveBeenCalledWith("fade-in");
  const asset = container.querySelector('[data-effect-id="slide-up"]')!,
    data = { setData: vi.fn() };
  fireEvent.dragStart(asset, { dataTransfer: data });
  expect(drag).toHaveBeenCalledWith("slide-up", data);
  expect(asset.classList.contains("is-dragging")).toBe(true);
  fireEvent.dragEnd(asset);
  expect(asset.classList.contains("is-dragging")).toBe(false);
  const ids = [...container.querySelectorAll("[data-page-id]")].map((n) =>
    n.getAttribute("data-page-id"),
  );
  expect(new Set(ids).size).toBe(ids.length);
});
