import { advancedMotionIds, motionCatalog } from '../../src/motionCatalog';
import { createMotion } from '../../src/motion';
import { PageSchema, type PageNode } from '../../src/pageSpec';
import { blank, createNode, CanvasSchema } from '../../src/spec';
export const advancedId = (i: number) => `60000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
export function advancedFixture(only?: string, bare = false) {
    const children: PageNode[] = advancedMotionIds.filter(id => !only || id === only).map((id) => {
        const index = advancedMotionIds.indexOf(id), def = motionCatalog[id], type = def.targetType.includes('image') ? 'image' : def.targetType.includes('button') ? 'button' : def.targetType.includes('paragraph') ? 'paragraph' : 'card', nodeId = advancedId(index * 10 + 10);
        const content = id === 'numeric-gauge-sweep' ? '75%' : id === 'split-line-assembly' ? '每一行靈感\n組成完整作品\nLine three' : id === 'character-decode' ? 'Decode 繁體中文 2026 👩‍💻' : id === 'rolling-characters' ? '2026 創作' : id === 'kinetic-text-wave' ? '讓文字起舞 Wave' : '讓原始內容清楚呈現';
        return { id: nodeId, type, effects: bare ? [] : [createMotion(id, nodeId)], style: { gap: 'small', padding: 'medium', align: 'start', tone: type === 'button' ? 'accent' : 'plain', width: 'full' }, ...(type === 'image' ? { src: '/assets/workspace.svg', alt: '原始圖片，不可改寫' } : type === 'card' ? { children: [0, 1, 2].map(i => ({ id: advancedId(index * 10 + 11 + i), type: 'paragraph', content: ['構思', '設計', '實作'][i], effects: [], style: { gap: 'none', padding: 'small', align: 'start', tone: 'plain', width: 'full' } })) } : { content, ...(type === 'button' ? { href: 'https://example.com' } : {}) }) } as PageNode;
    });
    return PageSchema.parse({ schemaVersion: 2, metadata: { title: '20種進階動畫驗收', language: 'zh-Hant' }, typography: 'sans', styles: 'neutral', responsive: { mobileColumns: 1, desktopColumns: 1 }, sections: [{ id: advancedId(1), type: 'section', effects: [], style: { gap: 'large', padding: 'medium' }, children }] });
}
export function advancedCanvas() { const canvas = blank(); canvas.metadata.name = '進階動畫草稿'; canvas.nodes = advancedMotionIds.map((id, i) => { const types = motionCatalog[id].targetType, type = types.includes('image') ? 'image' : types.includes('button') ? 'button' : types.includes('text') ? 'text' : 'card'; const node = createNode(type, (i % 5) * 280 + 10, Math.floor(i / 5) * 280 + 10); node.width = 250; node.height = 230; node.content = id === 'numeric-gauge-sweep' ? '75%' : type === 'card' ? '構思\n設計\n實作' : '真實原始內容'; if (type === 'button')
    node.href = 'https://example.com'; node.effects = [createMotion(id, node.id)]; return node; }); return CanvasSchema.parse(canvas); }
