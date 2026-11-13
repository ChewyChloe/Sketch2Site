import { PageSchema } from '../../src/pageSpec';
import { createMotion } from '../../src/motion';
export const motionId = (n: number) => `81000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export function motionFixture() {
    return PageSchema.parse({ schemaVersion: 2, metadata: { title: '原創動畫驗證示例（非 AI）', language: 'zh-Hant' }, typography: 'sans', styles: 'neutral', responsive: { mobileColumns: 1, desktopColumns: 1 }, sections: [{ id: motionId(1), type: 'section', children: [
                    { id: motionId(2), type: 'heading', content: '原創動畫驗證示例', level: 1, effects: [createMotion('slide-up', motionId(2), { distancePx: 32, easing: 'linear', trigger: 'enter' })] },
                    { id: motionId(3), type: 'paragraph', content: '1,234.50', effects: [createMotion('count-up', motionId(3), { endValue: 1234.5, decimals: 2, durationMs: 300 })] },
                    { id: motionId(4), type: 'paragraph', content: '讓內容成為視覺的主角', effects: [createMotion('curved-path-text', motionId(4))] },
                    { id: motionId(5), type: 'button', content: '回到標題', href: '#' + motionId(2), effects: [createMotion('breathing-glow', motionId(5))] },
                    { id: motionId(6), type: 'card', effects: [createMotion('flip-card', motionId(6), { backText: '使用者提供的背面內容' })], children: [{ id: motionId(7), type: 'paragraph', content: '使用者提供的正面內容' }] },
                    { id: motionId(8), type: 'card', effects: [createMotion('fold-reveal', motionId(8), { underText: '使用者提供的下層內容' })], children: [{ id: motionId(9), type: 'paragraph', content: '拖曳折角探索原始內容' }] },
                    { id: motionId(10), type: 'card', effects: [createMotion('physics-tag-field', motionId(10), { labels: ['設計', '工程', '研究'], gravity: 0, spawnIntervalMs: 60 })], children: [{ id: motionId(11), type: 'paragraph', content: '使用者提供的技能分類' }] },
                    { id: motionId(12), type: 'card', effects: [createMotion('stagger-reveal', motionId(12), { direction: 'reverse', revealStyle: 'scale' })], children: [{ id: motionId(13), type: 'paragraph', content: '先閱讀內容' }, { id: motionId(14), type: 'paragraph', content: '再觀察互動' }] },
                ] }] });
}
