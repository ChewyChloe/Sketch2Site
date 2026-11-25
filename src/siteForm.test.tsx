// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { PageRuntime } from "./PageRuntime";
import { PageRenderer } from "./PageRenderer";
import { blank, CanvasSchema } from "./spec";
import { createBlock } from "./blockTemplates";
import { createDemoCandidate } from "./demo";

function contactPage(endpoint = "https://formspree.io/f/abc123") {
  const base = { ...blank(), metadata: { ...blank().metadata, name: "聯絡", layoutMode: "reflow" as const } };
  const block = createBlock(base, "contact")!;
  const spec = CanvasSchema.parse({ ...base, metadata: { ...base.metadata, height: block.height }, nodes: block.nodes.map((n) => (n.type === "form" ? { ...n, href: endpoint } : n)) });
  return createDemoCandidate(spec).page;
}
const fill = () => {
  fireEvent.change(screen.getByLabelText("姓名"), { target: { value: "小明" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
  fireEvent.change(screen.getByLabelText("訊息"), { target: { value: "你好" } });
  fireEvent.submit(screen.getByRole("button", { name: "送出" }).closest("form")!);
};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("site form", () => {
  it("posts the fields to the configured endpoint on a live site and reports success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<PageRuntime input={contactPage()} />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("訊息").tagName).toBe("TEXTAREA");
    fill();
    await waitFor(() => expect(screen.getByText("已送出，謝謝你的留言")).toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://formspree.io/f/abc123");
    expect((init.body as FormData).get("Email")).toBe("a@b.co");
  });
  it("reports a failed submission honestly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<PageRuntime input={contactPage()} />);
    fill();
    await waitFor(() => expect(screen.getByText("送出失敗，請稍後再試")).toBeInTheDocument());
  });
  it("never sends from the editor preview", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<PageRenderer input={contactPage()} />);
    fill();
    await waitFor(() => expect(screen.getByText(/預覽時不會真的送出/)).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
