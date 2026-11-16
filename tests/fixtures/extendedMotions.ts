import { PageSchema } from '../../src/pageSpec';
import { createMotion } from '../../src/motion';

export const extendedMotionId = (n: number) => `82000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const extendedMotionNames = {
    'letter-assembly': '逐字聚合',
    'accent-stroke': '重點描線',
    'image-reveal': '影像展幕',
    'magnetic-control': '磁吸按鈕',
    'press-feedback': '按壓回饋',
    'focus-transfer': '群組焦點轉移',
    'scroll-progress': '區塊閱讀進度',
    'disclosure-panel': '詳情收合',
} as const;
export const extendedMotionNodeIds = {
    'letter-assembly': extendedMotionId(2),
    'accent-stroke': extendedMotionId(3),
    'image-reveal': extendedMotionId(4),
    'magnetic-control': extendedMotionId(5),
    'press-feedback': extendedMotionId(6),
    'focus-transfer': extendedMotionId(7),
    'scroll-progress': extendedMotionId(10),
    'disclosure-panel': extendedMotionId(14),
} as const;
export const extendedMotionText = '組合 e\u0301 👩🏽‍💻 家庭👨‍👩‍👧‍👦';

export function extendedMotionFixture() {
    const effect = (id: keyof typeof extendedMotionNodeIds) => [createMotion(id, extendedMotionNodeIds[id])];
    const paragraph = (n: number, content: string) => ({ id: extendedMotionId(n), type: 'paragraph', content });
    return PageSchema.parse({
        schemaVersion: 2,
        metadata: { title: '延伸動畫互動驗證', language: 'zh-Hant' },
        typography: 'sans', styles: 'neutral',
        responsive: { mobileColumns: 1, desktopColumns: 1 },
        sections: [{ id: extendedMotionId(1), type: 'section', children: [
            { id: extendedMotionId(2), type: 'heading', level: 1, content: extendedMotionText, effects: effect('letter-assembly') },
            { id: extendedMotionId(3), type: 'paragraph', content: '讓閱讀重點自然浮現', effects: effect('accent-stroke') },
            { id: extendedMotionId(4), type: 'image', src: '/assets/workspace.svg', alt: '工作空間插圖', effects: effect('image-reveal') },
            { id: extendedMotionId(5), type: 'button', content: '探索磁吸回饋', href: '#' + extendedMotionId(2), effects: effect('magnetic-control') },
            { id: extendedMotionId(6), type: 'button', content: '體驗按壓回饋', href: '#' + extendedMotionId(2), effects: effect('press-feedback') },
            { id: extendedMotionId(7), type: 'card', effects: effect('focus-transfer'), children: [paragraph(8, '先聚焦構思'), paragraph(9, '再聚焦實作')] },
            { id: extendedMotionId(10), type: 'card', effects: effect('scroll-progress'), children: [
                paragraph(11, '構思階段：逐項整理內容與閱讀順序。'.repeat(24)),
                paragraph(12, '設計階段：確認版面與操作回饋。'.repeat(24)),
                paragraph(13, '實作階段：逐項驗證內容與互動。'.repeat(24)),
            ] },
            { id: extendedMotionId(14), type: 'card', effects: effect('disclosure-panel'), children: [paragraph(15, '詳情摘要始終可讀'), paragraph(16, '展開後閱讀完整補充說明')] },
        ] }],
    });
}
