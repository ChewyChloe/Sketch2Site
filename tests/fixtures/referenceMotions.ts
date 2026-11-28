import { referenceMotionIds } from '../../src/motionCatalog';
import { createMotion } from '../../src/motion';

// One section per reference motion; shared by the reference e2e test and the export build test.
export type Id = (typeof referenceMotionIds)[number];
export const uid = (n: number) => `73000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// A fresh style object per node: shared references count against the page budget.
const styleOf = () => ({ gap: 'medium', padding: 'medium', align: 'start', tone: 'plain', width: 'full' });
const nodeFor = (id: Id, index: number, withEffect: boolean) => {
    const nid = uid(100 + index), effects = withEffect ? [createMotion(id, nid)] : [];
    if (id === "feature-deck" || id === "orbit-exhibit") return { id: nid, type: "media", content: "展示輪播", media: { kind: "carousel", images: ["/assets/samples/cafe.jpg", "/assets/samples/camera.jpg", "/assets/samples/coffee-flatwhite.jpg"], autoplay: false, seconds: 4, arrows: true, dots: true }, style: styleOf(), effects };
    if (["aurora-pools", "petal-eddies", "relay-connections", "corner-reprint", "waypoint-pill", "grain-tide", "lantern-rise"].includes(id)) return { id: nid, type: "card", style: styleOf(), effects, children: [{ id: uid(250 + index), type: "heading", level: 2, content: "展示動態", style: styleOf(), effects: [] }] };
    if (id === 'dolly-frame' || id === 'color-wake') return { id: nid, type: 'image', src: '/assets/samples/coffee-flatwhite.jpg', alt: '拿鐵與拉花', style: styleOf(), effects };
    if (id === 'vanishing-lattice') return { id: nid, type: 'card', style: styleOf(), effects, children: [
        { id: uid(190), type: 'paragraph', content: '地平線之前', style: styleOf(), effects: [] },
    ] };
    if (id === 'chart-build') return { id: nid, type: 'media', content: '每月來客', media: { kind: 'chart', chart: 'bar', points: [{ label: '一月', value: 32 }, { label: '二月', value: 48 }, { label: '三月', value: 66 }], unit: '' }, style: styleOf(), effects };
    if (id === 'scroll-ink-words') return { id: nid, type: 'paragraph', content: '我們每天早上烘一小批豆子，讓每一杯都喝得到剛出爐的香氣。慢慢讀，字會跟著亮起來。', style: styleOf(), effects };
    return { id: nid, type: 'heading', level: 2, content: id === 'letter-windows' ? 'COFFEE 咖啡' : id === 'bold-relay' ? '今天也來一杯' : '自家烘豆', style: styleOf(), effects };
};
export const referenceFixture = (withEffect: boolean) => {
    const sections = referenceMotionIds.slice(0, 29).map((id, i) => ({ id: uid(10 + i), type: 'section', style: styleOf(), effects: [], children: [nodeFor(id, i, withEffect)] }));
    sections.push({ id: uid(39), type: "section", style: styleOf(), effects: [], children: referenceMotionIds.slice(29).map((id, i) => nodeFor(id, i + 29, withEffect)) });
    return ({
    schemaVersion: 2, metadata: { title: '參考動畫', language: 'zh-Hant' }, typography: 'sans', styles: 'neutral', responsive: { mobileColumns: 1, desktopColumns: 1 },
    chrome: { nav: true, footer: false, navItems: [{ id: uid(100 + referenceMotionIds.indexOf("waypoint-pill")) }, { id: uid(100 + referenceMotionIds.indexOf("grain-tide")) }] },
    sections,
    });
};
