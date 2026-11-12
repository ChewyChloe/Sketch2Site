import { it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { zipProject } from "./archive";
it("produces standard ZIP records with matching CRC for text and binary", () => {
  const archive = zipProject([
    { path: "src/page.json", content: '{"title":"作品集"}' },
    { path: "public/a.png", content: new Uint8Array([0, 1, 255, 128]) },
  ]);
  const result = JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        "import sys,io,zipfile,json; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({n:list(z.read(n)) for n in z.namelist()}))",
      ],
      { input: Buffer.from(archive), encoding: "utf8" },
    ),
  );
  expect(result["public/a.png"]).toEqual([0, 1, 255, 128]);
  expect(
    new TextDecoder().decode(new Uint8Array(result["src/page.json"])),
  ).toContain("作品集");
});
it("rejects traversal, duplicate, absolute and ambiguous paths", () => {
  for (const path of [
    "../x",
    "a/../x",
    "/tmp/x",
    "a\\b",
    "a//x",
    "a/./x",
    "x\u0000y",
  ])
    expect(() => zipProject([{ path, content: "bad" }])).toThrow();
  expect(() =>
    zipProject([
      { path: "a", content: "" },
      { path: "a", content: "" },
    ]),
  ).toThrow();
});
