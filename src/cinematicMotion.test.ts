import { it, expect } from 'vitest';
import { motionIds, advancedMotionIds, cinematicMotionIds, motionCatalog, motionControlSchemas, defaultControls, signatureMotionIds } from './motionCatalog';
import { thirdFixture, thirdCanvas } from '../tests/fixtures/cinematicMotions';
import { cinematicSampleControls } from './cinematicSamples';
import { createMotion, targetReason, combinationReason, withinMotionBudget } from './motion';
import { materialize, prepareIntent, verifyPreservation } from './generation';
import { mockLayout } from '../tests/fixtures/generation';
import { indexNodes, applyPatchBatch, createPageSession } from './patch';
import { PageSchema } from './pageSpec';
import { motionAssetRefs, imageSource } from './assetRef';
it('retains forty existing IDs and adds exactly twenty new distinct presets', () => { expect(motionIds).toHaveLength(68); expect(cinematicMotionIds).toHaveLength(20); expect(new Set(motionIds).size).toBe(68); expect(motionIds.slice(20, 40)).toEqual([...advancedMotionIds]); expect(motionIds.slice(40, 60)).toEqual([...cinematicMotionIds]); expect(motionIds.slice(60)).toEqual([...signatureMotionIds]); });
it.each(cinematicMotionIds)('%s validates safe controls and rejects arbitrary code and out-of-range parameters', id => { const controls = { ...defaultControls(id), ...cinematicSampleControls(id) }; expect(motionControlSchemas[id].safeParse(controls).success).toBe(true); expect(motionControlSchemas[id].safeParse({ ...controls, onclick: 'run()' }).success).toBe(false); for (const [key, c] of Object.entries(motionCatalog[id].controls)) {
    if (c.kind === 'number')
        for (const value of [NaN, Infinity, c.min! - 1, c.max! + 1])
            expect(motionControlSchemas[id].safeParse({ ...controls, [key]: value }).success).toBe(false);
    if (c.kind === 'select')
        expect(motionControlSchemas[id].safeParse({ ...controls, [key]: '<svg onload=x>' }).success).toBe(false);
} expect(PageSchema.safeParse(thirdFixture(id)).success).toBe(true); expect(targetReason({ type: 'untrusted' }, id)).not.toBeNull(); });
it('requires explicit alternate text and image assets rather than inventing content', () => { for (const id of ['text-morph-transition', 'cursor-image-follower', 'scroll-image-sequence'] as const)
    expect(motionControlSchemas[id].safeParse(defaultControls(id)).success).toBe(false); expect(() => createMotion('text-morph-transition', crypto.randomUUID(), { toText: '<script>x</script>' })).toThrow(); for (const path of ['https://example.com/frame.svg', 'data:image/svg+xml,x', '/assets/sequence/../../x.svg', 'javascript:alert(1)']) {
    expect(imageSource.safeParse(path).success).toBe(false);
    expect(() => createMotion('cursor-image-follower', crypto.randomUUID(), { image: path })).toThrow();
} expect(() => createMotion('scroll-image-sequence', crypto.randomUUID(), { frames: ['/assets/workspace.svg', '/assets/workspace.svg'] })).toThrow(); });
it('materializes actual child cards and preserves text, source geometry and every motion in Mock generation', () => { const c = thirdCanvas(), snapshot = JSON.stringify(c), p = materialize(c, mockLayout(prepareIntent(c))); expect(() => verifyPreservation(c, p)).not.toThrow(); const nodes = indexNodes(p); for (const source of c.nodes) {
    const n = nodes.get(source.id)!;
    expect(n.effects).toEqual(source.effects);
    if (['card-stack-shuffle', 'horizontal-scroll-gallery', 'pinned-story-panels'].includes(source.effects[0].presetId)) {
        expect(n.children?.map(n => n.type)).toEqual(['card', 'card', 'card']);
        expect(n.children?.map(n => n.children?.[0].content).join('\n')).toBe(source.content);
    }
} expect(JSON.stringify(c)).toBe(snapshot); expect(p.draftLayout?.items).toHaveLength(20); const hostile = structuredClone(p), group = [...indexNodes(hostile).values()].find(n => n.effects.some(e => e.presetId === 'card-stack-shuffle'))!; group.children![0].children![0].content = '新增未授權文字'; expect(() => verifyPreservation(c, hostile)).toThrow(); });
it('ordinary text/style patches preserve bound motion IDs, controls and asset order', () => { const page = thirdFixture(), session = createPageSession(page), text = [...indexNodes(page).values()].find(n => n.type === 'paragraph' && n.effects.some(e => e.presetId === 'text-morph-transition'))!, before = text.effects; const result = applyPatchBatch(session, { schemaVersion: 1, sessionId: session.sessionId, baseRevision: session.revision, patches: [{ operation: 'set-text', targetId: text.id, payload: { content: '使用者明確修改主文' } }] }, [text.id]); expect(result.ok).toBe(true); if (result.ok)
    expect(indexNodes(result.after).get(text.id)!.effects).toEqual(before); });
it('enforces real groups, particle/filter budgets and incompatible scene combinations', () => { for (const id of ['card-stack-shuffle', 'horizontal-scroll-gallery', 'pinned-story-panels'] as const) {
    expect(targetReason({ type: 'card', content: '只有一行' }, id)).not.toBeNull();
    expect(targetReason({ type: 'card', children: [{ type: 'paragraph' }, { type: 'paragraph' }, { type: 'paragraph' }] }, id)).not.toBeNull();
} const e = createMotion('particle-constellation', crypto.randomUUID()); expect(withinMotionBudget(Array(4).fill(e))).toBe(false); expect(combinationReason([{ presetId: 'spring-drag-snap' }, { presetId: 'hover-lift' }])).not.toBeNull(); });
it('collects image follower and sequence asset refs for runtime and export', () => { const refs = motionAssetRefs([createMotion('cursor-image-follower', crypto.randomUUID(), { image: '/assets/workspace.svg' }), createMotion('scroll-image-sequence', crypto.randomUUID(), cinematicSampleControls('scroll-image-sequence'))]); expect(refs).toHaveLength(4); expect(new Set(refs).size).toBe(4); });
it('updates full image-sequence controls through the typed Patch transport, including asset paths longer than label limits', () => { const p = thirdFixture('scroll-image-sequence'), node = p.sections[0].children![0], s = createPageSession(p); const update = (frames: unknown) => applyPatchBatch(s, { schemaVersion: 1, sessionId: s.sessionId, baseRevision: s.revision, patches: [{ operation: 'update-effect', targetId: node.id, payload: { effectId: 'scroll-image-sequence', validatedControls: { frames, viewportHeightPx: 200 } } }] }, [node.id]); expect(update([...node.effects[0].validatedControls.frames as string[]].reverse()).ok).toBe(true); expect(update(['https://example.com/a.svg', 'https://example.com/b.svg']).ok).toBe(false); expect(update(Array(13).fill('/assets/workspace.svg')).ok).toBe(false); });
import {buildLunaRequest} from '../server/provider';
it.each(cinematicMotionIds)('offline provider payload accepts %s without changing paid-service safeguards',id=>{const c=thirdCanvas();c.nodes=c.nodes.filter(n=>n.effects[0].presetId===id);const request=buildLunaRequest(prepareIntent(c));expect(request.model).toBe('gpt-6-luna');expect(request.service_tier).toBe('default');expect(request.max_output_tokens).toBe(4096);expect(request.tools).toEqual([]);expect(Buffer.byteLength(JSON.stringify(request))).toBeLessThanOrEqual(16384);});
