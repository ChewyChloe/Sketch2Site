import { expect, it } from "vitest";
import { href, PageSchema, type PageNode } from "./pageSpec";
import { demoPage } from "./pageFixtures";

it.each([
  "https://discord.gg/Sketch2Site",
  "https://discord.com/channels/123/456?message=789#latest",
  "https://github.com/openai?tab=repositories#readme",
  "https://example.com:443/path",
  "https://learn.microsoft.com/",
  "HTTPS://GitHub.com/openai",
  "https://例子.com/path",
])("accepts public HTTPS and retains the exact URL: %s", (value) => {
  expect(href.parse(value)).toBe(value);
  const page = structuredClone(demoPage);
  const setLink = (node: PageNode): void => {
    if (node.type === "button") node.href = value;
    node.children?.forEach(setLink);
  };
  page.sections.forEach(setLink);
  expect(PageSchema.safeParse(page).success).toBe(true);
});

it.each([
  "javascript:alert(1)", "data:text/html,x", "http://github.com", "ftp://github.com",
  "//github.com", "https:github.com", "https:///github.com",
  "https://user:pass@github.com", "https://user@github.com", "https://@github.com",
  "https://github.com@localhost", "https://github.com:444", "https://github.com:80",
  "https://github.com:", " https://github.com", "https://github.com/ ",
  "https://git\nhub.com", "https://github.com/\t", "https://github.com/\0",
  "https://github.com/\u007f", "https://github.com/\u0085",
  "https://github.com\\@example.com", "https://%67ithub.com",
  "https://localhost", "https://sub.localhost", "https://printer.local",
  "https://service.internal", "https://router.lan", "https://box.localdomain",
  "https://box.home.arpa", "https://intranet", "https://evil.invalid",
  "https://github.com.", "https://bad_label.com", "https://-bad.com",
  "https://127.0.0.1", "https://10.0.0.1", "https://192.168.1.1",
  "https://172.16.0.1", "https://169.254.169.254", "https://0.0.0.0",
  "https://8.8.8.8", "https://2130706433", "https://0x7f000001",
  "https://0177.0.0.1", "https://127.1", "https://[::1]",
  "https://[fc00::1]", "https://[::ffff:127.0.0.1]", "https://[2606:4700:4700::1111]",
  "#------------------------------------", "#not-a-uuid",
])("rejects unsafe or nonpublic URL: %s", (value) => {
  expect(href.safeParse(value).success).toBe(false);
});

it("retains the 2048-character limit", () => {
  const value = "https://github.com/".padEnd(2048, "a");
  expect(href.safeParse(value).success).toBe(true);
  expect(href.safeParse(`${value}a`).success).toBe(false);
});

it("accepts UUID anchors while requiring a canonical existing page target", () => {
  const page = structuredClone(demoPage);
  const button = (nodes: PageNode[]): PageNode | undefined => {
    for (const node of nodes) {
      if (node.type === "button") return node;
      const found = button(node.children ?? []);
      if (found) return found;
    }
  };
  const target = page.sections[0].id;
  button(page.sections)!.href = `#${target}`;
  expect(href.safeParse(`#${target}`).success).toBe(true);
  expect(PageSchema.safeParse(page).success).toBe(true);
  button(page.sections)!.href = "#11111111-1111-4111-8111-111111111111";
  expect(PageSchema.safeParse(page).success).toBe(false);
});
