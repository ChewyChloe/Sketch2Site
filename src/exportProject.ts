import assetSchema from "./assetRef.ts?raw";
import { isLocalAsset } from "./assetRef";
import { readAsset } from "./assets";
import type { PageNode } from "./pageSpec";
import { PageSchema } from "./pageSpec";
import { zipProject, type ProjectFile } from "./archive";
import notices from "../THIRD_PARTY_NOTICES.md?raw";
import foldGeometrySource from "./foldGeometry.ts?raw";
import physicsSource from "./physics.ts?raw";
import physicsTagsSource from "./PhysicsTags.tsx?raw";
import foldSource from "./FoldReveal.tsx?raw";
import motionRuntimeSource from "./MotionRuntime.tsx?raw";
import motionSource from "./motion.ts?raw";
import motionCatalogSource from "./motionCatalog.ts?raw";
import runtime from "./PageRuntime.tsx?raw";
import schema from "./pageSpec.ts?raw";
import styles from "./pageRuntime.css?raw";
import tokens from "./exportTokens.css?raw";
import manifest from "./export-template/package.json?raw";
import lock from "./export-template/package-lock.json?raw";
export async function exportProjectFiles(
  input: unknown,
): Promise<ProjectFile[]> {
  const page = PageSchema.parse(input);
  const refs = new Set<string>();
  const walk = (node: PageNode) => {
    if (node.src) refs.add(node.src);
    node.children?.forEach(walk);
  };
  page.sections.forEach(walk);
  const files: ProjectFile[] = [
    { path: "package.json", content: manifest },
    { path: "THIRD_PARTY_NOTICES.md", content: notices },
    { path: "package-lock.json", content: lock },
    {
      path: "index.html",
      content:
        '<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>匯出網站</title></head><body><div id="root"></div><script type="module" src="./src/main.tsx"></script></body></html>',
    },
    {
      path: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            moduleResolution: "Bundler",
            jsx: "react-jsx",
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            resolveJsonModule: true,
            allowImportingTsExtensions: true,
            types: ["vite/client"],
          },
          include: ["src", "vite.config.ts"],
        },
        null,
        2,
      ),
    },
    {
      path: "vite.config.ts",
      content:
        'import { defineConfig } from "vite";\nexport default defineConfig({base:"./"});\n',
    },
    {
      path: "src/main.tsx",
      content:
        'import { createRoot } from "react-dom/client";\nimport { PageRuntime } from "./PageRuntime";\nimport page from "./page.json";\nimport "./tokens.css";\ndocument.title=page.metadata.title;\ncreateRoot(document.getElementById("root")!).render(<PageRuntime input={page}/>);\n',
    },
    { path: "src/PageRuntime.tsx", content: runtime },
    { path: "src/pageSpec.ts", content: schema },
    { path: "src/motion.ts", content: motionSource },
    { path: "src/MotionRuntime.tsx", content: motionRuntimeSource },
    { path: "src/physics.ts", content: physicsSource },
    { path: "src/PhysicsTags.tsx", content: physicsTagsSource },
    { path: "src/FoldReveal.tsx", content: foldSource },
    { path: "src/foldGeometry.ts", content: foldGeometrySource },
    { path: "src/motionCatalog.ts", content: motionCatalogSource },
    { path: "src/pageRuntime.css", content: styles },
    { path: "src/tokens.css", content: tokens },
    { path: "src/page.json", content: JSON.stringify(page, null, 2) },
    {
      path: "README.md",
      content:
        "# 匯出網站\n\n使用 Node.js 24 LTS，執行 `npm ci`、`npm run dev`；正式建置為 `npm run build`，預覽產物為 `npm run preview`。首次安裝需連線 npm，網站執行不需 Sketch2Site 後端。\n\n內容來自經驗證的頁面，文字、素材與已套用的受控動畫隨專案提供。修改後可自行建置；動畫遵守 prefers-reduced-motion。只包含目前頁面，不包含草稿、註記、編輯歷史、使用者秘密或 AI 呼叫功能。\n",
    },
  ];
  files.push({ path: "src/assetRef.ts", content: assetSchema });
  for (const ref of refs)
    if (isLocalAsset(ref)) {
      const image = await readAsset(ref);
      if (!image) throw new Error("找不到本機圖片，請重新匯入。");
      files.push({
        path: "public" + ref,
        content: new Uint8Array(await image.blob.arrayBuffer()),
      });
    }
  if (refs.has("/assets/workspace.svg")) {
    const response = await fetch(
      import.meta.env.BASE_URL + "assets/workspace.svg",
    );
    if (!response.ok) throw new Error("內建素材無法讀取。");
    const asset = await response.text();
    if (asset.length > 100000 || !asset.includes("<svg"))
      throw new Error("內建素材格式無效。");
    files.push({ path: "public/assets/workspace.svg", content: asset });
  }
  return files;
}
export async function exportProject(input: unknown) {
  return zipProject(await exportProjectFiles(input));
}
export async function downloadProject(input: unknown) {
  const zip = await exportProject(input),
    url = URL.createObjectURL(new Blob([zip], { type: "application/zip" })),
    link = document.createElement("a");
  link.href = url;
  link.download = "sketch2site-website.zip";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
