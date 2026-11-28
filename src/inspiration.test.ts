import { describe, expect, it } from "vitest";
import { hintsFrom, pickBoard, robotsAllows, safeUrl, verifiedCases, type CaseAnalysis } from "./inspiration";

const base: CaseAnalysis = { n: 1, relevance: 2, composition: "editorial-column", focal: "headline", typeFamily: "sans", typeScale: "large", space: "dense", colorMode: "duo", lightness: "dark", imageRatio: "none", interaction: ["none-visible"], pattern: "深色分欄" };
const serif: CaseAnalysis = { ...base, n: 2, relevance: 3, typeFamily: "serif", space: "airy", lightness: "light", imageRatio: "landscape", pattern: "照片配襯線字" };

describe("web inspiration", () => {
  it("keeps only addresses the search tool cited, without duplicates", () => {
    const answer = { keywords: ["cafe website"], cases: [
      { url: "https://a.example.com/work/cafe", title: "Cafe A", why: "好" },
      { url: "https://invented.example.org/", title: "Made up", why: "假" },
      { url: "https://b.example.net/", title: "Cafe B", why: "好" },
      { url: "https://a.example.com/other", title: "Cafe A again", why: "重複站" },
      { url: "https://c.example.io/x", title: "cafe-a", why: "重複標題" },
    ] };
    const cited = ["https://a.example.com/work/cafe", "https://b.example.net/blog/post", "https://c.example.io/x", "https://a.example.com/other"];
    const out = verifiedCases(answer, cited);
    expect(out.map((c) => c.host)).toEqual(["a.example.com", "b.example.net"]);
    expect(verifiedCases(answer, cited, ["https://a.example.com/work/cafe"]).map((c) => c.url)).not.toContain("https://a.example.com/work/cafe");
  });
  it("refuses unsafe addresses", () => {
    for (const u of ["http://a.example.com/", "https://localhost/", "https://192.168.1.2/", "https://u:p@a.example.com/", "https://x.internal/"]) expect(safeUrl(u)).toBeNull();
    expect(safeUrl("https://a.example.com/#top")?.toString()).toBe("https://a.example.com/");
  });
  it("respects robots.txt for every agent", () => {
    const robots = "User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /private\n";
    expect(robotsAllows(robots, "/")).toBe(true);
    expect(robotsAllows(robots, "/private/page")).toBe(false);
    expect(robotsAllows("User-agent: *\nDisallow: /", "/")).toBe(false);
  });
  it("builds the board from relevance, likes and exclusions", () => {
    const zero = { ...base, n: 3, relevance: 0 };
    expect(pickBoard([base, serif, zero]).map((a) => a.n)).toEqual([2, 1]);
    expect(pickBoard([base, serif], { 1: { like: true } }).map((a) => a.n)).toEqual([1, 2]);
    expect(pickBoard([base, serif], { 2: { exclude: true } }).map((a) => a.n)).toEqual([1]);
  });
  it("turns the board into hints, honouring like, exclude and chosen dimensions", () => {
    expect(hintsFrom([base, serif]).typeFamily).toBe("serif");
    expect(hintsFrom([base, serif], { 1: { like: true } }).typeFamily).toBe("sans");
    expect(hintsFrom([base, serif], { 2: { exclude: true } }, { 1: "a.example.com", 2: "b.example.net" }).sources).toEqual(["a.example.com"]);
    // Case 2 only teaches type: its space does not vote.
    const h = hintsFrom([base, serif], { 2: { dims: ["type"] } });
    expect(h.typeFamily).toBe("serif");
    expect(h.space).toBe("dense");
    expect(h.interaction).toBeUndefined();
  });
});

import { privateAddress } from "../server/inspirationCapture";
describe("capture safety", () => {
  it("refuses private and local addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1", "100.64.0.1"]) expect(privateAddress(ip)).toBe(true);
    for (const ip of ["93.184.216.34", "2606:4700::1111"]) expect(privateAddress(ip)).toBe(false);
  });
});
