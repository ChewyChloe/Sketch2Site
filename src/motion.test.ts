import { it, expect } from "vitest";
import { PageSchema } from "./pageSpec";
import { demoPage } from "./pageFixtures";
import { motionCatalog, MotionSchema, legacyMotion, createMotion, compatibleMotion, combinationReason } from "./motion";
it("migrates only validated legacy fields, preserving values and binding the original target", () => {
    const id = demoPage.sections[0].id;
    const motion = MotionSchema.parse(legacyMotion({ effectId: 'slide-up', duration: 120, delay: 35, distance: 0, stagger: 30 }, id));
    expect(motion).toEqual({ presetId: 'slide-up', presetVersion: 0, targetId: id, validatedControls: { durationMs: 120, delayMs: 35, distancePx: 0, intervalMs: 30 } });
    expect(MotionSchema.safeParse(legacyMotion({ effectId: 'slide-up', onclick: 'run()' }, id)).success).toBe(false);
    const page = structuredClone(demoPage);
    page.sections[0].effects = [{ ...motion, targetId: crypto.randomUUID() }];
    expect(PageSchema.safeParse(page).success).toBe(false);
});
it("uses strict new controls and target compatibility, and rejects unsupported versions", () => {
    const id = demoPage.sections[0].id;
    expect(createMotion('fade-in', id).validatedControls.durationMs).toBe(450);
    expect(() => createMotion('hover-lift', id, { durationMs: 500 })).toThrow();
    expect(compatibleMotion({ id, type: 'heading', content: '標題' }, createMotion('hover-glow', id))).toBe(false);
    expect(MotionSchema.safeParse({ presetId: 'fade-in', presetVersion: 99, targetId: id, validatedControls: {} }).success).toBe(false);
    expect(combinationReason([createMotion('fade-in', id), createMotion('slide-up', id)])).toBeNull();
});
import { applyPatchBatch, createPageSession, indexNodes, travelPage } from './patch';
it('applies versioned controls atomically through scoped patches and preserves undo/reload', () => {
    let state = createPageSession(demoPage);
    const id = [...indexNodes(state.history.present).values()].find(n => n.type === 'paragraph' && !n.effects.length)!.id;
    const commit = (patches: unknown[]) => applyPatchBatch(state, { schemaVersion: 1, sessionId: state.sessionId, baseRevision: state.revision, patches }, [id]);
    let result = commit([{ operation: 'attach-effect', targetId: id, payload: createMotion('slide-up', id) }]);
    expect(result.ok).toBe(true);
    if (!result.ok)
        return;
    state = result.state;
    const before = JSON.stringify(state.history.present);
    expect(commit([{ operation: 'update-effect', targetId: id, payload: { effectId: 'slide-up', validatedControls: { distancePx: 900 } } }]).ok).toBe(false);
    expect(commit([{ operation: 'update-effect', targetId: id, payload: { effectId: 'slide-up', validatedControls: { onclick: 'alert(1)' } } }]).ok).toBe(false);
    expect(JSON.stringify(state.history.present)).toBe(before);
    result = commit([{ operation: 'update-effect', targetId: id, payload: { effectId: 'slide-up', validatedControls: { distancePx: 64, easing: 'linear', trigger: 'enter' } } }]);
    expect(result.ok).toBe(true);
    if (!result.ok)
        return;
    expect(result.diff.changedIds).toEqual([id]);
    state = result.state;
    expect(indexNodes(PageSchema.parse(JSON.parse(JSON.stringify(state.history.present)))).get(id)!.effects[0].validatedControls.distancePx).toBe(64);
    expect(indexNodes(travelPage(state, 'undo').history.present).get(id)!.effects[0].validatedControls.distancePx).toBe(24);
    expect(indexNodes(travelPage(travelPage(state, 'undo'), 'redo').history.present).get(id)!.effects[0].validatedControls.distancePx).toBe(64);
});
it('requires real secondary content, original numeric end values, and compatible combinations', () => {
    const id = demoPage.sections[0].id;
    expect(() => createMotion('flip-card', id)).toThrow();
    expect(() => createMotion('fold-reveal', id)).toThrow();
    expect(compatibleMotion({ id, type: 'paragraph', content: '10' }, createMotion('count-up', id, { endValue: 100 }))).toBe(false);
    expect(compatibleMotion({ id, type: 'paragraph', content: '1,234.50' }, createMotion('count-up', id, { endValue: 1234.5, decimals: 2 }))).toBe(true);
    expect(compatibleMotion({ id, type: 'paragraph', content: '1,234.50' }, createMotion('count-up', id, { endValue: 1234.5, decimals: 0 }))).toBe(false);
    expect(combinationReason([{ presetId: 'hover-glow' }, { presetId: 'breathing-glow' }])).not.toBeNull();
    expect(combinationReason([{ presetId: 'flip-card' }, { presetId: 'fold-reveal' }])).not.toBeNull();
    expect(compatibleMotion({ id, type: 'card', children: [{}] }, createMotion('stagger-reveal', id))).toBe(false);
    expect(compatibleMotion({ id, type: 'card', children: [{}, {}] }, createMotion('stagger-reveal', id))).toBe(true);
});
import { withinMotionBudget } from './motion';
it('bounds cumulative live physics and looping motion costs', () => {
    const id = demoPage.sections[0].id;
    const physics = createMotion('physics-tag-field', id, { labels: Array.from({ length: 24 }, (_, i) => String(i)), maxTags: 24 });
    expect(withinMotionBudget([physics, physics])).toBe(true);
    expect(withinMotionBudget([physics, physics, physics])).toBe(false);
    expect(withinMotionBudget(Array.from({ length: 9 }, () => createMotion('breathing-glow', id)))).toBe(false);
});
it('does not expose an unfinished preset as a usable versioned instance',()=>{
 const previous=motionCatalog['fold-reveal'].status;
 try{motionCatalog['fold-reveal'].status='PARTIAL';expect(()=>createMotion('fold-reveal',demoPage.sections[0].id,{underText:'測試下層'})).toThrow();}
 finally{motionCatalog['fold-reveal'].status=previous;}
});

it('rejects overlapping text/interactive transforms and bounds expensive extended presets',async()=>{
 const id=demoPage.sections[0].id;
 const {combinationReason,withinMotionBudget,createMotion}=await import('./motion');
 expect(combinationReason([{presetId:'letter-assembly'},{presetId:'count-up'}])).toBeTruthy();
 expect(combinationReason([{presetId:'magnetic-control'},{presetId:'hover-lift'}])).toBeTruthy();
 expect(combinationReason([{presetId:'focus-transfer'},{presetId:'disclosure-panel'}])).toBeTruthy();
 expect(withinMotionBudget(Array.from({length:13},()=>createMotion('letter-assembly',id)))).toBe(false);
 expect(withinMotionBudget(Array.from({length:9},()=>createMotion('scroll-progress',id)))).toBe(false);
 expect(withinMotionBudget([createMotion('accent-stroke',id),createMotion('scroll-progress',id)])).toBe(true);
});
