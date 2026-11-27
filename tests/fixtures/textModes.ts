import { createMotion } from "../../src/motion";
import { PageNodeSchema } from "../../src/pageSpec";

export const textModes = [
  { id: "breathing-glow", controls: { pulse: "heartbeat" }, key: "scale", value: "1.055", title: "心跳波紋" },
  { id: "kinetic-text-wave", controls: { form: "flag" }, key: "transform", value: "skewY(12deg)", title: "旗面飄揚" },
  { id: "letter-assembly", controls: { arrival: "magnet" }, key: "transform", value: "translateX(-12px)", title: "雙向吸附" },
  { id: "blur-in", controls: { entry: "trail" }, key: "filter", value: "drop-shadow", title: "拖影疾入" },
  { id: "kinetic-text-wave", controls: { form: "stretch-wave" }, key: "scale", value: "1.177", title: "縱向伸縮" },
] as const;

export const textModeId = (index: number) => `41000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;

export function textModesSection(only?: number) {
  return PageNodeSchema.parse({
    id: textModeId(99), type: "section", children: textModes.flatMap((mode, index) => {
      if (only !== undefined && index !== only) return [];
      const id = textModeId(index);
      return [{
        id, type: "heading", level: 2, content: mode.title + "文字",
        effects: [createMotion(mode.id, id, mode.controls)],
      }];
    }),
  });
}
