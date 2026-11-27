import { createMotion } from "../../src/motion";
import { PageNodeSchema } from "../../src/pageSpec";

export const marqueeLayouts = ["dual-speed", "counter-columns", "layered-rush", "vertical-stack", "ribbon-cross"] as const;
export const marqueeId = (suffix: number) => `45000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
export function marqueeModesSection() {
  return PageNodeSchema.parse({
    id: marqueeId(1), type: "section", children: marqueeLayouts.map((layout, i) => {
      const id = marqueeId(i + 2);
      return { id, type: "heading", level: 2, content: "城市聲音與日常風景",
        effects: [createMotion("marquee-text", id, { layout })] };
    }),
  });
}
