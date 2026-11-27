import { PageNodeSchema, type PageNode } from "../../src/pageSpec";

export function galleryCategorySection(): PageNode {
  const id = (suffix: number) => `35000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
  const gallery = {
    id: id(1), type: "section", role: "gallery", children: [
      { id: id(2), type: "heading", level: 2, content: "精選攝影" },
      { id: id(3), type: "grid", columns: 3, children: [
        { id: id(4), type: "image", src: "/assets/samples/cafe.jpg", alt: "第一張", galleryCategory: "街景" },
        { id: id(5), type: "image", src: "/assets/samples/camera.jpg", alt: "第二張", galleryCategory: "靜物" },
        { id: id(6), type: "image", src: "/assets/samples/coffee-flatwhite.jpg", alt: "第三張" },
      ] },
    ],
  };
  return PageNodeSchema.parse(gallery);
}
