import type { ThemeId, SectionRole } from "./pageSpec";

// The generation brief: a fill-in sentence with quick choices plus a short note.
// Choices steer the local layout directly; the free note is only read by AI.
export type Brief = { audience: string; purpose: string; mood: string; focus: string; note: string; details?: string; style?: import("./referenceStyle").ReferenceStyle; referencePurposes?: import("./referenceStyle").ReferencePurpose[]; referenceEvidence?: import("./referenceStyle").Evidence[]; caseFeedback?: Record<string, "prefer" | "avoid">; moodLinks?: { url: string; note: string; likes: ("layout" | "type" | "color" | "space" | "photo" | "motion")[] }[]; ask?: import("./directions").Ask };
export const emptyBrief: Brief = { audience: "", purpose: "", mood: "", focus: "", note: "" };

export const briefOptions = {
  audience: ["學生", "新生", "家長", "老師", "附近居民", "上班族", "活動參加者"],
  purpose: ["社團招生", "活動宣傳", "店家介紹", "作品展示", "課程專題", "個人介紹"],
  mood: ["活潑", "專業", "溫暖", "簡約", "自然", "科技感", "清爽"],
  focus: ["報名按鈕", "價格", "照片", "活動資訊", "常見問題", "聯絡方式"],
} as const;
export type BriefField = keyof typeof briefOptions;

// Mood picks one of the reviewed themes.
export const moodThemes: Record<string, ThemeId> = {
  活潑: "blossom",
  專業: "ocean",
  溫暖: "forest",
  簡約: "mono",
  自然: "forest",
  科技感: "midnight",
  清爽: "classic",
};
// Focus moves the matching section right after the opening section.
export const focusRoles: Record<string, SectionRole[]> = {
  報名按鈕: ["cta", "contact"],
  價格: ["pricing"],
  照片: ["gallery"],
  常見問題: ["faq"],
  聯絡方式: ["contact", "cta"],
  活動資訊: ["features", "content"],
};

/** Moves the first section matching the brief's focus right after the opening section. */
export function withFocusFirst<T extends { role: SectionRole }>(sections: T[], focus: string | undefined): T[] {
  const out = [...sections];
  // Roles are in priority order: the first one present wins. If it is already right
  // after the opening section, leave the order alone (a later role must not push it back).
  for (const role of focusRoles[focus ?? ""] ?? []) {
    const at = out.findIndex((s, i) => i > 0 && s.role === role);
    if (at < 0) continue;
    if (at > 1) {
      const [moved] = out.splice(at, 1);
      out.splice(1, 0, moved);
    }
    break;
  }
  return out;
}

// Short phrases offered as greyed-out continuations while typing the note.
const common = [
  "主色想用學校的藍色",
  "主色想用溫暖的橘色",
  "按鈕要大一點、很明顯",
  "文字少一點，多用圖片",
  "手機上看起來要清楚",
  "標題要簡短有力",
  "整體留白多一點",
  "動畫不要太多",
  "希望看起來專業又親切",
  "希望第一眼就知道在做什麼",
  "希望按鈕和重點顏色一致",
  "想要乾淨、不花俏的版面",
  "想要有活力的感覺",
  "不要太多文字",
  "不要用太刺眼的顏色",
];
const byPurpose: Record<string, string[]> = {
  社團招生: ["報名截止日期要醒目", "社課時間放在最上面", "要看得出社團氣氛", "新生常見問題放前面", "希望新生一眼看懂怎麼報名"],
  活動宣傳: ["活動日期和地點放最上面", "報名人數有限要提醒", "附上交通方式", "倒數的感覺"],
  店家介紹: ["營業時間要放在最上面", "菜單價格要清楚", "地址和地圖放在下面", "要有溫馨的感覺"],
  作品展示: ["作品照片要放大", "每個作品附一句說明", "聯絡方式放在最後", "風格要乾淨俐落"],
  課程專題: ["研究成果放在最前面", "流程用步驟呈現", "附上組員介紹", "數據圖表要清楚"],
  個人介紹: ["經歷用時間軸呈現", "照片放在首屏", "聯絡方式要明顯", "語氣親切一點"],
};

export function phrasesFor(purpose: string): string[] {
  return [...(byPurpose[purpose] ?? []), ...common];
}

/**
 * Greyed-out continuation for the note: the rest of a phrase that starts with
 * what the user is typing in the current clause (after the last comma).
 */
export function suggestion(note: string, purpose: string): string {
  const clause = note.split(/[，,、；;。]/).at(-1)!.trimStart();
  if (!clause) return "";
  const hit = phrasesFor(purpose).find((p) => p.startsWith(clause) && p.length > clause.length);
  return hit ? hit.slice(clause.length) : "";
}

export function briefSentence(b: Brief): string {
  const parts = [
    b.audience || b.purpose ? `給${b.audience || "大家"}看的${b.purpose || "網站"}` : "",
    b.mood ? `感覺${b.mood}` : "",
    b.focus ? `重點是${b.focus}` : "",
    b.note,
    b.details,
  ].filter(Boolean);
  return parts.join("，");
}
// A reference picture's style counts as a description too.
export const hasBrief = (b?: Partial<Brief> | null) => !!b && (Boolean(b.style) || Boolean(Object.keys(b.caseFeedback ?? {}).length) || Boolean(b.ask && (b.ask.refs || b.ask.hero || b.ask.lightness?.length || b.ask.avoid)) || Object.values(b).some((v) => typeof v === "string" && v.trim()));


export function withGenerationBrief(draft: import("./spec").CanvasSpec, brief: Brief) {
  const clean = { ...brief, details: brief.details?.trim() || undefined };
  const next = hasBrief(clean) ? clean : undefined;
  if (JSON.stringify(next) === JSON.stringify(draft.metadata.brief)) return draft;
  const { brief: _old, ...metadata } = draft.metadata;
  return { ...draft, metadata: next ? { ...metadata, brief: next } : metadata };
}
