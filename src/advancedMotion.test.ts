import { it, expect } from 'vitest';
import { advancedMotionIds, motionIds, motionCatalog, motionControlSchemas, defaultControls } from './motionCatalog';
import { advancedFixture, advancedCanvas } from '../tests/fixtures/advancedMotions';
import { createMotion, combinationReason, withinMotionBudget, targetReason } from './motion';
import { PageSchema } from './pageSpec';
import { materialize, prepareIntent, verifyPreservation } from './generation';
import { mockLayout } from '../tests/fixtures/generation';
import { commitHistory, undoHistory, redoHistory } from './history';
import { CanvasSchema } from './spec';
it('retains the original and advanced ID sets in the expanded catalog', () => { expect(motionIds.slice(0, 20)).toEqual(['fade-in', 'slide-up', 'scale-in', 'hover-lift', 'hover-glow', 'stagger-reveal', 'breathing-glow', 'curved-path-text', 'count-up', 'flip-card', 'physics-tag-field', 'fold-reveal', 'letter-assembly', 'accent-stroke', 'image-reveal', 'magnetic-control', 'press-feedback', 'focus-transfer', 'scroll-progress', 'disclosure-panel']); expect(advancedMotionIds).toHaveLength(20); expect(motionIds).toHaveLength(77); expect(new Set(motionIds).size).toBe(75); });
it.each(advancedMotionIds)('%s validates defaults, rejects unknown/unsafe/out-of-range controls and wrong target', id => { expect(motionControlSchemas[id].safeParse(defaultControls(id)).success).toBe(true); expect(motionControlSchemas[id].safeParse({ ...defaultControls(id), html: '<script>x</script>' }).success).toBe(false); for (const [key, c] of Object.entries(motionCatalog[id].controls)) {
    if (c.kind === 'number')
        for (const value of [Infinity, NaN, (c.max ?? 0) + 1, (c.min ?? 0) - 1])
            expect(motionControlSchemas[id].safeParse({ ...defaultControls(id), [key]: value }).success).toBe(false);
    if (c.kind === 'select')
        expect(motionControlSchemas[id].safeParse({ ...defaultControls(id), [key]: 'url(javascript:x)' }).success).toBe(false);
} expect(targetReason({ type: 'untrusted' }, id)).not.toBeNull(); expect(PageSchema.safeParse(advancedFixture(id)).success).toBe(true); });
it('all twenty draft motions materialize through Mock into validated PageSpec without content or geometry loss', () => { const c = advancedCanvas(), before = JSON.stringify(c), p = materialize(c, mockLayout(prepareIntent(c))); expect(() => verifyPreservation(c, p)).not.toThrow(); expect(PageSchema.safeParse(p).success).toBe(true); expect(p.draftLayout?.items).toHaveLength(20); expect(JSON.stringify(c)).toBe(before); expect(CanvasSchema.parse(JSON.parse(before))).toEqual(c); });
it('draft apply/remove and history keep geometry and old data stable', () => { const c = advancedCanvas(), clean = structuredClone(c); clean.nodes.forEach(n => n.effects = []); const h = { past: [], present: clean, future: [] }; const next = commitHistory(h, c); expect(undoHistory(next).present).toEqual(clean); expect(redoHistory(undoHistory(next)).present).toEqual(c); expect(c.nodes.map(n => ({ ...n, effects: [] }))).toEqual(clean.nodes); });
it('rejects conflicting text/image/child transforms and excessive advanced resources', () => { for (const ids of [['character-decode', 'count-up'], ['venetian-reveal', 'cinematic-image-pan'], ['card-deck-fan', 'fold-reveal'], ['perspective-tilt', 'hover-lift']])
    expect(combinationReason(ids.map(presetId => ({ presetId: presetId as typeof motionIds[number] })))).not.toBeNull(); const e = createMotion('character-decode', advancedIdForBudget); expect(withinMotionBudget(Array(24).fill(e))).toBe(true); expect(withinMotionBudget(Array(25).fill(e))).toBe(false); expect(targetReason({ type: 'text', content: '101%' }, 'numeric-gauge-sweep')).not.toBeNull(); expect(targetReason({ type: 'text', content: '$75' }, 'numeric-gauge-sweep')).not.toBeNull(); });
const advancedIdForBudget = '60000000-0000-4000-8000-000000000001';
it('keeps previously valid legacy interaction combinations readable',()=>{expect(combinationReason([{presetId:'stagger-reveal'},{presetId:'flip-card'}])).toBeNull();expect(combinationReason([{presetId:'stagger-reveal'},{presetId:'focus-transfer'}])).toBeNull();});
import {buildLunaRequest} from '../server/provider';
it.each(advancedMotionIds)('offline real-provider request for %s preserves the pinned model, no tools and existing input cap',id=>{const canvas=advancedCanvas();canvas.nodes=canvas.nodes.filter(n=>n.effects[0].presetId===id);const request=buildLunaRequest(prepareIntent(canvas));expect(request.model).toBe('gpt-6-luna');expect(request.service_tier).toBe('default');expect(request.max_output_tokens).toBe(4096);expect(request.tools).toEqual([]);expect(Buffer.byteLength(JSON.stringify(request))).toBeLessThanOrEqual(16384);});
// Only an outline is sent, so even a large twenty-effect draft stays far under the unchanged 16 KB guard.
it('sends a large twenty-effect draft as a small outline under the unchanged size guard',()=>{const r=buildLunaRequest(prepareIntent(advancedCanvas()));expect(Buffer.byteLength(JSON.stringify(r))).toBeLessThanOrEqual(8192);expect(JSON.stringify(r)).not.toContain('"box"');});
