// @vitest-environment jsdom
import { afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PageRenderer, componentRegistry } from "./PageRenderer";
import { componentIdFromElement, type PageNode } from "./pageSpec";
import { demoPage } from "./pageFixtures";
afterEach(cleanup);
it("renders semantic registry content, safe links and DOM correspondence", () => {
  const { container } = render(<PageRenderer input={demoPage} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "把想法，排成一個頁面。",
  );
  expect(screen.getByRole("img").getAttribute("src")).toBe(
    "/assets/workspace.svg",
  );
  const link = screen.getByRole("link", { name: "閱讀網頁開發文件" });
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
  const ids = Array.from(container.querySelectorAll("[data-page-id]")).map(
    (el) => el.getAttribute("data-page-id"),
  );
  expect(new Set(ids).size).toBe(ids.length);
  expect(componentIdFromElement(link)).toBe(link.getAttribute("data-page-id"));
});
it("treats HTML and event strings inside content as inert text", () => {
  const page = structuredClone(demoPage);
  const heading =
    page.sections[0].children![0].children![0].children![0].children![0];
  heading.content = '<img src=x onerror="alert(1)"><script>evil()</script>';
  const { container } = render(<PageRenderer input={page} />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
    "<script>",
  );
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector("img[src=x]")).toBeNull();
});
it("rejects invalid input before rendering and recovers on valid input", () => {
  const { rerender, container } = render(
    <PageRenderer input={{ ...demoPage, script: "secret /internal/path" }} />,
  );
  expect(screen.getByRole("alert").textContent).toContain("預覽失敗");
  expect(screen.getByRole("alert").textContent).not.toContain("/internal/path");
  expect(container.querySelector("[data-page-id]")).toBeNull();
  rerender(<PageRenderer input={demoPage} />);
  expect(screen.queryByRole("alert")).toBeNull();
});
it("skips registry work for unchanged nodes when a sibling is updated", () => {
  const entry = componentRegistry.paragraph;
  const getter = vi.fn(() => "page-paragraph");
  Object.defineProperty(entry, "className", {
    get: getter,
    configurable: true,
  });
  try {
    const { rerender } = render(<PageRenderer input={demoPage} />);
    const calls = getter.mock.calls.length;
    const page = structuredClone(demoPage);
    const visit = (n: PageNode): PageNode | undefined =>
      n.type === "heading" ? n : n.children?.map(visit).find(Boolean);
    visit(page.sections[0])!.content = "新標題";
    rerender(<PageRenderer input={page} />);
    expect(getter.mock.calls.length).toBe(calls);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "新標題",
    );
  } finally {
    Object.defineProperty(entry, "className", {
      value: "page-paragraph",
      writable: true,
      configurable: true,
    });
  }
});

it("shows the built-in sample image as a labelled frame on themed pages", () => {
  const still = (n: PageNode): PageNode => ({ ...n, effects: [], ...(n.children ? { children: n.children.map(still) } : {}) });
  render(<PageRenderer input={{ ...demoPage, theme: "ocean", sections: demoPage.sections.map(still) }} />);
  const sample = screen.getByRole("img");
  expect(sample.className).toBe("page-image-placeholder");
  expect(sample.getAttribute("aria-label")).toBeTruthy();
});
