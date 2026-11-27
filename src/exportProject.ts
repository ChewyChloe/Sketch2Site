import cinematicMotionSource from "./CinematicMotion.tsx?raw";
import mediaRuntimeSource from "./MediaRuntime.tsx?raw";
import depthSource from "./Depth3D.tsx?raw";
import depthSceneSource from "./depthScene.ts?raw";
import cinematicTextSource from "./CinematicText.tsx?raw";
import storyMotionSource from "./StoryMotion.tsx?raw";
import advancedMotionSource from "./AdvancedMotion.tsx?raw";
import signatureMotionSource from "./SignatureMotion.tsx?raw";
import referenceTypographySource from "./ReferenceTypography.ts?raw";
import referenceMotionSource from "./ReferenceMotion.tsx?raw";
import referenceMetaSource from "./referenceMotions.ts?raw";
import sectionLayoutSource from "./sectionLayout.ts?raw";
import sectionLockSource from "./sectionLock.ts?raw";
import assetSchema from "./assetRef.ts?raw";
import { builtInAssets, motionAssetRefs, isLocalAsset } from "./assetRef";
import { readAsset } from "./assets";
import type { PageNode } from "./pageSpec";
import { PageSchema, allSections, mediaAssetRefs } from "./pageSpec";
import { zipProject, type ProjectFile } from "./archive";
import { exportDisplayFonts, exportFontFiles, huninn, notoSansTC } from "./exportFonts";
import notices from "../THIRD_PARTY_NOTICES.md?raw";
import foldGeometrySource from "./foldGeometry.ts?raw";
import physicsSource from "./physics.ts?raw";
import physicsTagsSource from "./PhysicsTags.tsx?raw";
import foldSource from "./FoldReveal.tsx?raw";
import extendedMotionSource from "./ExtendedMotion.tsx?raw";
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
    motionAssetRefs(node.effects).forEach(ref=>refs.add(ref));
    mediaAssetRefs(node.media).forEach((ref) => refs.add(ref));
    node.children?.forEach(walk);
  };
  allSections(page).forEach(walk);
  if (page.brand?.logo) refs.add(page.brand.logo);
  if (page.brand?.logoAlt) refs.add(page.brand.logoAlt);
  if (page.brand?.icon) refs.add(page.brand.icon);
  const files: ProjectFile[] = [
    { path: "package.json", content: manifest },
    { path: "THIRD_PARTY_NOTICES.md", content: notices },
    { path: "package-lock.json", content: lock },
    {
      path: "index.html",
      content:
        '<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>匯出網站</title>' + (page.brand?.icon ? '<link rel="icon" href=".' + page.brand.icon + '"/>' : '') + '</head><body><div id="root"></div><script type="module" src="./src/main.tsx"></script></body></html>',
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
        'import { createRoot } from "react-dom/client";\nimport { PageRuntime } from "./PageRuntime";\nimport page from "./page.json";\nimport "./fonts.css";\nimport "./tokens.css";\ndocument.title=page.metadata.title;\ncreateRoot(document.getElementById("root")!).render(<PageRuntime input={page}/>);\n',
    },
    { path: "src/PageRuntime.tsx", content: runtime },
    { path: "src/pageSpec.ts", content: schema },
    { path: "src/sectionLayout.ts", content: sectionLayoutSource },
    { path: "src/sectionLock.ts", content: sectionLockSource },
    { path: "src/motion.ts", content: motionSource },
    { path: "src/ExtendedMotion.tsx", content: extendedMotionSource },
    { path: "src/AdvancedMotion.tsx", content: advancedMotionSource },
    { path: "src/SignatureMotion.tsx", content: signatureMotionSource },
    { path: "src/ReferenceMotion.tsx", content: referenceMotionSource },
    { path: "src/ReferenceTypography.ts", content: referenceTypographySource },
    { path: "src/referenceMotions.ts", content: referenceMetaSource },
    { path: "src/CinematicMotion.tsx", content: cinematicMotionSource },
    { path: "src/CinematicText.tsx", content: cinematicTextSource },
    { path: "src/StoryMotion.tsx", content: storyMotionSource },
    { path: "src/MotionRuntime.tsx", content: motionRuntimeSource },
    { path: "src/MediaRuntime.tsx", content: mediaRuntimeSource },
    { path: "src/Depth3D.tsx", content: depthSource },
    { path: "src/depthScene.ts", content: depthSceneSource },
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
        "# 匯出網站\n\n使用 Node.js 24 LTS，執行 `npm ci`、`npm run dev`；正式建置為 `npm run build`，預覽產物為 `npm run preview`，首次安裝需連線 npm，網站執行不需 Sketch2Site 後端，\n\n內容來自經驗證的頁面，文字、素材與已套用的受控動畫隨專案提供，修改後可自行建置；動畫遵守 prefers-reduced-motion，只包含目前頁面，不包含草稿、註記、編輯歷史、使用者秘密或 AI 呼叫功能，\n",
    },
  ];
  files.push({ path: "src/assetRef.ts", content: assetSchema });
  // Chinese fonts: only the pieces this page's text needs. Noto Sans TC always; 粉圓 only when the page uses it.
  const pageText = JSON.stringify(page);
  const usesRounded = /"rounded"/.test(pageText) || (page as { concept?: string }).concept === "poster";
  files.push(...(await exportFontFiles(pageText, undefined, usesRounded ? [notoSansTC, huninn] : [notoSansTC])));
  // A design concept uses the Latin display fonts; they ride along in the same fonts.css.
  if ((page as { concept?: string }).concept) {
    const display = await exportDisplayFonts();
    const css = files.find((f) => f.path === "src/fonts.css");
    if (css) css.content = String(css.content) + "\n" + display.css;
    files.push(...display.files);
  }
  for (const ref of refs)
    if (isLocalAsset(ref)) {
      const image = await readAsset(ref);
      if (!image) throw new Error("找不到本機圖片，請重新匯入");
      files.push({
        path: "public" + ref,
        content: new Uint8Array(await image.blob.arrayBuffer()),
      });
    }
  for(const builtin of builtInAssets)if (refs.has(builtin)) {
    const response = await fetch(
      import.meta.env.BASE_URL + builtin.slice(1),
    );
    if (!response.ok) throw new Error("內建素材無法讀取");
    if (builtin.endsWith(".jpg")) {
      // Sample photos ship as JPEG; verify the magic bytes and a sane size.
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 400000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("內建素材格式無效");
      files.push({ path: "public" + builtin, content: bytes });
      continue;
    }
    const asset = await response.text();
    if (asset.length > 100000 || !asset.includes("<svg"))
      throw new Error("內建素材格式無效");
    files.push({ path: "public"+builtin, content: asset });
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
