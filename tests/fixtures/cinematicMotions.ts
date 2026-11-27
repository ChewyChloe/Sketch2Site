import { cinematicMotionIds, motionCatalog } from '../../src/motionCatalog';
import { cinematicSample, cinematicSampleControls } from '../../src/cinematicSamples';
import { PageSchema } from '../../src/pageSpec';
import { blank, createNode, CanvasSchema } from '../../src/spec';
import { createMotion } from '../../src/motion';
export const thirdId = (n: number) => `92000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export function thirdFixture(only?: string, bare = false) { const sections = cinematicMotionIds.filter(id => !only || id === only).map(id => { const index = cinematicMotionIds.indexOf(id), ids = Array.from({ length: 16 }, (_, i) => thirdId(index * 20 + i + 1)), page = cinematicSample(id, ids); if (bare)
    page.sections[0].children![0].effects = []; return page.sections[0]; }); return PageSchema.parse({ schemaVersion: 2, metadata: { title: '第三批20種動畫驗收', language: 'zh-Hant' }, typography: 'sans', styles: 'neutral', responsive: { mobileColumns: 1, desktopColumns: 1 }, sections }); }
export function thirdCanvas() { const c = blank(); c.metadata.name = '第三批進階動態'; c.nodes = cinematicMotionIds.map((id, i) => { const types = motionCatalog[id].targetType, type = types.includes('image') ? 'image' : types.includes('button') ? 'button' : types.includes('text') ? 'text' : 'card', n = createNode(type, (i % 5) * 280 + 10, Math.floor(i / 5) * 280 + 10); n.width = 250; n.height = 230; n.content = type === 'card' ? '使用者第一張卡片\n使用者第二張卡片\n使用者第三張卡片' : '使用者原始文字'; if (type === 'button')
    n.href = 'https://example.com'; n.effects = [createMotion(id, n.id, cinematicSampleControls(id))]; return n; }); return CanvasSchema.parse(c); }

export function tabsFixture() {
    const input = cinematicSample("pinned-story-panels", Array.from({ length: 16 }, (_, i) => thirdId(800 + i)));
    const card = input.sections[0].children![0];
    card.effects = [createMotion("disclosure-panel", card.id, { presentation: "tabs", durationMs: 400 })];
    return PageSchema.parse(input);
}
