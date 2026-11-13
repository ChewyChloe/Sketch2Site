import { it, expect } from "vitest";
import { motionIds, motionCatalog, motionControlSchemas, defaultControls } from "./motionCatalog";
it("defines all twelve original motions with one controlled parameter source", () => {
    expect(Object.keys(motionCatalog)).toEqual([...motionIds]);
    for (const id of motionIds) {
        const def = motionCatalog[id];
        expect(def.id).toBe(id);
        expect(def.specVersion).toBe(1);
        expect(def.compatibilityRules.length).toBeGreaterThan(4);
        expect(def.constraints.length).toBeGreaterThan(1);
        expect(def.reducedMotionFallback.length).toBeGreaterThan(3);
        expect(motionControlSchemas[id].safeParse({ ...defaultControls(id), onclick: "run()" }).success).toBe(false);
    }
});
it("rejects invalid ranges, invented data defaults and unsafe rich text", () => {
    expect(motionControlSchemas['fade-in'].safeParse({ durationMs: 149 }).success).toBe(false);
    expect(motionControlSchemas['slide-up'].safeParse({ distancePx: 65 }).success).toBe(false);
    expect(motionControlSchemas['count-up'].safeParse(defaultControls('count-up')).success).toBe(false);
    expect(motionControlSchemas['count-up'].safeParse({ endValue: Infinity }).success).toBe(false);
    expect(motionControlSchemas['flip-card'].safeParse({ backText: '<img onerror="run()">' }).success).toBe(false);
    expect(motionControlSchemas['physics-tag-field'].safeParse({ labels: Array(25).fill('a') }).success).toBe(false);
    expect(motionControlSchemas['physics-tag-field'].safeParse({ labels: ['設計', '設計'] }).success).toBe(false);
    expect(motionControlSchemas['fold-reveal'].safeParse({ underText: '使用者的下層內容', revealThreshold: .1 }).success).toBe(false);
    expect(motionControlSchemas['curved-path-text'].safeParse({ curvature: 'custom-svg' }).success).toBe(false);
});
it('rejects empty required faces and markup inside tag labels', () => {
    expect(motionControlSchemas['flip-card'].safeParse({ backText: '   ' }).success).toBe(false);
    expect(motionControlSchemas['fold-reveal'].safeParse({ underText: '\n\t' }).success).toBe(false);
    expect(motionControlSchemas['physics-tag-field'].safeParse({ labels: ['<img onerror=x>'] }).success).toBe(false);
});
