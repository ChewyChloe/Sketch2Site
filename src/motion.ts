import { z } from "zod";
import { cinematicMotionIds, advancedMotionIds, motionCatalog, motionIds, motionControlSchemas, defaultControls, type MotionId, type MotionControls } from "./motionCatalog";
export { cinematicMotionIds, advancedMotionIds, motionCatalog, motionIds, defaultControls };
export type { MotionId, MotionControls };
export type MotionInstance = {
    presetId: MotionId;
    presetVersion: 0 | 1;
    targetId: string;
    validatedControls: MotionControls;
};
export const legacyMotionIds = motionIds.slice(0, 6);
export const LegacyEffectSchema = z.object({ effectId: z.enum(legacyMotionIds), duration: z.number().int().min(120).max(1200).default(450), delay: z.number().int().min(0).max(1000).default(0), distance: z.number().int().min(0).max(32).default(12), stagger: z.number().int().min(30).max(150).default(70) }).strict();
const legacyControls = z.object({ durationMs: z.number().int().min(120).max(1200), delayMs: z.number().int().min(0).max(1000), distancePx: z.number().int().min(0).max(32), intervalMs: z.number().int().min(30).max(150) }).strict();
export const MotionSchema = z.object({ presetId: z.enum(motionIds), presetVersion: z.union([z.literal(0), z.literal(1)]), targetId: z.string().uuid(), validatedControls: z.unknown() }).strict().transform((v, ctx): MotionInstance => {
    if (v.presetVersion === 1 && motionCatalog[v.presetId].status !== 'DONE') {
        ctx.addIssue({ code: 'custom', message: '此效果尚未完成' });
        return z.NEVER;
    }
    const result = (v.presetVersion === 0 ? legacyControls : motionControlSchemas[v.presetId]).safeParse(v.validatedControls);
    if (v.presetVersion === 0 && !legacyMotionIds.includes(v.presetId) || !result.success) {
        ctx.addIssue({ code: "custom", message: "動畫版本或參數無效" });
        return z.NEVER;
    }
    const controls = result.data as MotionControls;
    if (v.presetId === 'physics-tag-field' && v.presetVersion === 1 && ((controls.labels as string[]).length > Number(controls.maxTags))) {
        ctx.addIssue({ code: 'custom', message: '標籤數量超過設定上限' });
        return z.NEVER;
    }
    return { ...v, validatedControls: controls };
});
export function legacyMotion(input: unknown, targetId: string): unknown {
    if (typeof input === 'string')
        input = { effectId: input === 'lift' ? 'hover-lift' : input };
    const result = LegacyEffectSchema.safeParse(input);
    if (!result.success)
        return input;
    const e = result.data;
    return { presetId: e.effectId, presetVersion: 0, targetId, validatedControls: { durationMs: e.duration, delayMs: e.delay, distancePx: e.distance, intervalMs: e.stagger } };
}
export function normalizeMotionInput(input: unknown, targetId: string): unknown {
    return input && typeof input === 'object' && 'presetId' in input ? input : legacyMotion(input, targetId);
}
export function bindMotionInput(input: unknown): unknown {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        return input;
    const v = input as Record<string, unknown>;
    return Array.isArray(v.effects) && typeof v.id === 'string' ? { ...v, effects: v.effects.map(e => normalizeMotionInput(e, v.id as string)) } : input;
}
export function createMotion(presetId: MotionId, targetId: string, controls: unknown = {}, presetVersion: 0 | 1 = 1): MotionInstance {
    return MotionSchema.parse({ presetId, presetVersion, targetId, validatedControls: controls });
}
export function motionNumber(e: MotionInstance, key: string, fallback = 0): number { const value = e.validatedControls[key]; return typeof value === 'number' ? value : fallback; }
export function motionDuration(e: MotionInstance): number {
    return motionNumber(e, e.presetId === 'stagger-reveal' && e.presetVersion === 1 ? 'childDurationMs' : e.presetId === 'curved-path-text' ? 'revealDurationMs' : 'durationMs', 450);
}
export function updateMotion(e: MotionInstance, input: Record<string, unknown>, legacy = false): MotionInstance {
    const keyMap: Record<string, string> = { duration: e.presetId === 'stagger-reveal' && e.presetVersion === 1 ? 'childDurationMs' : 'durationMs', delay: 'delayMs', distance: e.presetId === 'hover-lift' && e.presetVersion === 1 ? 'liftPx' : 'distancePx', stagger: 'intervalMs' };
    const parameters = legacy ? Object.fromEntries(Object.entries(input).map(([k, v]) => [keyMap[k] ?? k, v])) : input;
    return MotionSchema.parse({ ...e, validatedControls: { ...e.validatedControls, ...parameters } });
}
export function numericContent(content: string) {
    const match = /^([^0-9+\-]*)([+\-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)([^0-9]*)$/.exec(content.trim());
    if (!match)
        return null;
    const endValue = Number(match[2].replaceAll(',', ''));
    const decimals = (match[2].split('.')[1] ?? '').length;
    return Number.isFinite(endValue) && decimals <= 4 ? { endValue, prefix: match[1], suffix: match[3], decimals } : null;
}
export type MotionTarget = {
    id?: string;
    type: string;
    content?: string;
    children?: unknown[];
    media?: { kind?: string };
};
export const structuredGroupMotions=["card-stack-shuffle","horizontal-scroll-gallery","pinned-story-panels"] as const;
export function targetReason(target: MotionTarget, id: MotionId, version: 0 | 1 = 1): string | null {
    if (version === 0)
        return id === 'stagger-reveal' && !target.children?.length && target.type !== 'card' ? '依序顯示需要子元件' : null;
    const def = motionCatalog[id];
    if (!def.targetType.includes(target.type))
        return '此效果不適用於目前元件';
    if (['stagger-reveal','focus-transfer','disclosure-panel','card-deck-fan','layered-parallax','grid-diagonal-turn'].includes(id) && !(target.children ? target.children.length >= 2 : target.type === 'card' && (target.content ?? '').split('\n').filter(s => s.trim()).length >= 2))
        return '這個效果要有兩樣以上的內容，卡片請寫兩行';
    if(structuredGroupMotions.includes(id as typeof structuredGroupMotions[number])){
        const items=target.children,lines=(target.content??'').split('\n');const count=items?.length??lines.length;
        if(count<(id==='card-stack-shuffle'?3:2)||count>5||items?.some(n=>!n||typeof n!=='object'||!('type' in n)||n.type!=='card')||!items&&lines.some(line=>!line.trim()))return '需要'+(id==='card-stack-shuffle'?'3':'2')+'至5張真實子卡片；草稿卡片每行代表一張卡片';
    }
    if (id === 'numeric-gauge-sweep' && (!/^\s*(?:\d{1,3})(?:\.\d{1,4})?\s*[%％]?\s*$/.test(target.content ?? '') || !numericContent(target.content ?? '') || numericContent(target.content ?? '')!.endValue > 100)) return '儀表需使用0到100的真實數字或百分比';
    if (id === 'chart-build' && target.media?.kind !== 'chart')
        return '圖表動畫只適用於圖表';
    if (id === 'count-up' && !numericContent(target.content ?? ''))
        return '數字遞增只適用於既有數字內容';
    return null;
}
export function compatibleMotion(target: MotionTarget, e: MotionInstance): boolean {
    if (e.targetId !== target.id || targetReason(target, e.presetId, e.presetVersion))
        return false;
    if (e.presetId === 'count-up') {
        const c = e.validatedControls, raw = target.content ?? '', prefix = String(c.prefix ?? ''), suffix = String(c.suffix ?? '');
        if (!raw.startsWith(prefix) || !raw.endsWith(suffix))
            return false;
        const number = raw.slice(prefix.length, suffix ? raw.length - suffix.length : undefined).replaceAll(',', '').trim();
        if (!number || Number(number) !== c.endValue || Number(Number(c.endValue).toFixed(Number(c.decimals))) !== c.endValue)
            return false;
    }
    return true;
}
export function combinationReason(effects: readonly Pick<MotionInstance, "presetId">[]): string | null {
    const ids = new Set(effects.map(e => e.presetId));
    if (ids.has('hover-glow') && ids.has('breathing-glow'))
        return '光暈效果不可重複套用';
    if (ids.has('count-up') && ids.has('curved-path-text'))
        return '數字與曲線文字不可同時套用';
    if (['flip-card', 'physics-tag-field', 'fold-reveal','focus-transfer','disclosure-panel'].filter(id => ids.has(id as MotionId)).length > 1)
        return '互動內容效果一次只能套用一種';
    if (ids.has('physics-tag-field') && ids.has('stagger-reveal'))
        return '物理標籤不能再套用逐項進場';
    if (['typewriter','marquee-text','gradient-text-flow','scroll-ink-words','hollow-fill-sweep','letter-windows','bold-relay','letter-assembly','accent-stroke','count-up','curved-path-text','character-decode','split-line-assembly','rolling-characters','hand-drawn-highlight','kinetic-text-wave','numeric-gauge-sweep','text-morph-transition','elastic-word-bounce','text-spotlight-reveal','typographic-stretch'].filter(id=>ids.has(id as MotionId)).length>1)
        return '文字呈現效果一次只能套用一種';
    if(ids.has('magnetic-control') && ['hover-lift','slide-up','press-feedback'].some(id=>ids.has(id as MotionId)))
        return '磁吸按鈕不能和其他會移動或按壓的動畫一起用';
    const imageModes=['dolly-frame','image-reveal','venetian-reveal','circular-mask-expansion','cinematic-image-pan','pixel-dissolve','shutter-lens-transition','glitch-slice-reveal','liquid-distortion-reveal','scroll-image-sequence'];
    if(imageModes.filter(id=>ids.has(id as MotionId)).length>1)return '一張圖片一次只能用一種圖片動畫';
    if(ids.has('perspective-tilt')&&['hover-lift','slide-up','scale-in'].some(id=>ids.has(id as MotionId)))return '透視傾斜不能和其他會移動位置的動畫一起用';
    const childrenModes=['card-deck-fan','layered-parallax','grid-diagonal-turn','stagger-reveal','focus-transfer','disclosure-panel','fold-reveal','flip-card','physics-tag-field'];
    if(['card-deck-fan','layered-parallax','grid-diagonal-turn'].some(id=>ids.has(id as MotionId)) && childrenModes.filter(id=>ids.has(id as MotionId)).length>1)return '這類動畫一次只能用一種';
    const scene=effects.filter(e=>cinematicMotionIds.includes(e.presetId as typeof cinematicMotionIds[number]));
    if(scene.length>1)return '這類場景動畫一個元件只能用一種';
    if(scene.length&&['card-stack-shuffle','horizontal-scroll-gallery','sticky-section-morph','pinned-story-panels'].some(id=>ids.has(id as MotionId))&&effects.length>1)return '這個效果不能和其他動畫一起用';
    if(ids.has('spring-drag-snap')&&effects.length>1)return '拖曳吸附不可與其他位置效果同時套用';
    if(['float-idle','jelly-press'].some(id=>ids.has(id as MotionId))&&['hover-lift','slide-up','scale-in','perspective-tilt','magnetic-control','press-feedback','float-idle','jelly-press','blur-in'].filter(id=>ids.has(id as MotionId)).length>1)return '漂浮或彈跳不能與其他位移效果重疊';
    if(ids.has('color-wake')&&['pixel-dissolve','liquid-distortion-reveal','glitch-slice-reveal'].some(id=>ids.has(id as MotionId)))return '褪色回彩不能和會重畫圖片的動畫一起用';
    if (["crosswind-ribbons", "drift-letterfall", "turning-letter-mosaic", "imprint-beats"]
        .filter(id => ids.has(id as MotionId)).length > 1) return "同一段文字只能使用一種背景動態";
    if (ids.has("crosswind-ribbons") && ids.has("marquee-text")) return "同一段文字只能使用一種字帶";
    if(ids.has('chart-build')&&effects.length>1)return '圖表動畫不能和其他動畫一起用';
    if(ids.has('blur-in')&&['fade-in','slide-up','scale-in'].some(id=>ids.has(id as MotionId)))return '進場效果一次只能套用一種';
    return null;
}
/** Per-document resource limits, in addition to each preset's own bounds. */
export const motionPerformanceLimits = { physicsFields: 3, physicsTags: 48, breathingButtons: 8, textAssemblies:12, scrollIndicators:8 } as const;
export function withinMotionBudget(effects: readonly MotionInstance[]) {
    const physics = effects.filter(e => e.presetId === 'physics-tag-field');
    return effects.filter(e => e.presetId === "crosswind-ribbons" || e.presetId === "vanishing-lattice" || e.presetId === "drift-letterfall" || e.presetId === "turning-letter-mosaic").length <= 4 && effects.filter(e=>['text-morph-transition','elastic-word-bounce','text-spotlight-reveal','typographic-stretch'].includes(e.presetId)).length<=8 && effects.filter(e=>cinematicMotionIds.includes(e.presetId as typeof cinematicMotionIds[number])).length<=20 && effects.filter(e=>e.presetId==="particle-constellation"||e.presetId==="cursor-trail-particles").length<=3 && effects.filter(e=>e.presetId==="gooey-blob-merge"||e.presetId==="liquid-distortion-reveal").length<=4 && effects.filter(e=>advancedMotionIds.includes(e.presetId as typeof advancedMotionIds[number])).length<=24 && effects.filter(e=>e.presetId==='letter-assembly').length<=motionPerformanceLimits.textAssemblies && effects.filter(e=>e.presetId==='scroll-progress').length<=motionPerformanceLimits.scrollIndicators && physics.length <= motionPerformanceLimits.physicsFields && physics.reduce((sum, e) => sum + (e.validatedControls.labels as string[]).length, 0) <= motionPerformanceLimits.physicsTags && effects.filter(e => e.presetId === 'breathing-glow').length <= motionPerformanceLimits.breathingButtons;
}
