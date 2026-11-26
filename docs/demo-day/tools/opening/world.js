// Opening and closing animation for the demo video, after the user's storyboard:
// a wireframe page among mossy hills tips over into a floor, a girl pushes a wireframe block,
// a glowing panel offers ideas, the page becomes the finished site, then the title.
// Everything is a function of time t, so frames render the same every time.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1920, H = 1080;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#2440b0');
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
scene.add(new THREE.HemisphereLight('#dfe6ff', '#3c6a2a', 1.6));
const sun = new THREE.DirectionalLight('#fff6e8', 2.6);
sun.position.set(-4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); sun.shadow.bias = -0.0005;
scene.add(sun);

// ---------- helpers ----------
let seed = 7; const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const seg = (t, a, b) => ease((t - a) / (b - a));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const pop = (t, a, d = 0.35) => { const x = clamp((t - a) / d); return x <= 0 ? 0 : 1 + Math.sin(x * Math.PI) * 0.25 * (1 - x) - (1 - x) * (1 - x) * (x < 1 ? 1 : 0) * 0 ; };
const popScale = (t, a, d = 0.4) => { const x = clamp((t - a) / d); if (x <= 0) return 0; if (x >= 1) return 1; return 1 - Math.pow(1 - x, 3) + Math.sin(x * Math.PI) * 0.18; };
// a fuzzy felt surface: a noisy bump map shared by soft materials
const fuzz = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = 110 + rnd() * 145; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); return t; })();
const felt = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, bumpMap: fuzz, bumpScale: 4, ...extra });
const clay = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
const shadowy = (m) => { m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };
const loadImg = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });

// ---------- page textures ----------
function rr(x, X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); x.fill(); }
function dullPage() {
  const c = document.createElement('canvas'); c.width = 2100; c.height = 1300; const x = c.getContext('2d');
  x.fillStyle = '#efece6'; x.fillRect(0, 0, 2100, 1300);
  x.fillStyle = '#c9c6c0'; rr(x, 70, 60, 150, 34, 17); [1640, 1760, 1880].forEach((X) => rr(x, X, 64, 90, 26, 13));
  rr(x, 640, 170, 820, 40, 20); rr(x, 860, 240, 380, 70, 35);
  x.strokeStyle = '#bcb8b1'; x.lineWidth = 8; x.strokeRect(700, 360, 700, 380); x.beginPath(); x.moveTo(700, 360); x.lineTo(1400, 740); x.moveTo(1400, 360); x.lineTo(700, 740); x.stroke();
  x.fillStyle = '#c9c6c0'; [130, 770, 1410].forEach((X) => { rr(x, X, 830, 560, 260, 18); rr(x, X, 1130, 420, 28, 14); rr(x, X, 1180, 300, 28, 14); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
async function finishedPage() {
  const [hero, a, b, d] = await Promise.all(['club-shadow.jpg', 'club-exhibit.jpg', 'camera.jpg', 'club-camera.jpg'].map(loadImg));
  const c = document.createElement('canvas'); c.width = 2100; c.height = 1300; const x = c.getContext('2d');
  x.fillStyle = '#f4f1ea'; x.fillRect(0, 0, 2100, 1300);
  const cover = (img, X, Y, w, h) => { const s = Math.max(w / img.width, h / img.height), iw = w / s, ih = h / s; x.drawImage(img, (img.width - iw) / 2, (img.height - ih) / 2, iw, ih, X, Y, w, h); };
  x.save(); x.beginPath(); x.roundRect(40, 130, 2020, 700, 22); x.clip(); cover(hero, 40, 130, 2020, 700); x.fillStyle = 'rgba(13,14,17,.35)'; x.fillRect(40, 130, 2020, 700); x.restore();
  x.fillStyle = '#0d0e11'; x.font = '900 44px "Noto Sans TC"'; x.fillText('攝影社', 70, 92);
  x.font = '500 34px "Noto Sans TC"'; x.fillStyle = '#4a4a48'; x.fillText('上學期作品', 1300, 90); x.fillText('新生常見問題', 1520, 90);
  x.fillStyle = '#0d0e11'; rr(x, 1790, 52, 250, 56, 4); x.fillStyle = '#f4f1ea'; x.fillText('一起加入', 1845, 92);
  x.fillStyle = '#fff'; x.font = '900 150px "Noto Sans TC"'; x.fillText('攝影社，', 130, 380); x.fillText('新學期招生中', 130, 550);
  x.font = '500 44px "Noto Sans TC"'; x.fillText('沒有相機也可以，手機也能拍出好照片', 136, 640);
  x.fillStyle = '#18c964'; rr(x, 136, 690, 280, 84, 4); x.fillStyle = '#0d0e11'; x.font = '800 40px "Noto Sans TC"'; x.fillText('立即報名', 196, 746);
  [a, b, d].forEach((img, i) => { const X = 40 + i * 690; x.save(); x.beginPath(); x.roundRect(X, 870, 640, 300, 18); x.clip(); cover(img, X, 870, 640, 300); x.restore(); x.fillStyle = '#0d0e11'; rr(x, X, 1200, 380, 30, 6); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 680; const x = c.getContext('2d');
  x.fillStyle = '#eef0ff'; x.fillRect(0, 0, 512, 680);
  const cols = ['#ffd6f0', '#c9f2ff', '#e4d4ff', '#fff2c4', '#cfffe2'];
  for (let i = 0; i < 70; i++) { x.globalAlpha = 0.55; x.fillStyle = cols[i % cols.length]; x.beginPath(); x.arc(rnd() * 512, rnd() * 680, 20 + rnd() * 60, 0, 7); x.fill(); }
  x.globalAlpha = 1; x.filter = 'blur(18px)'; x.drawImage(c, 0, 0); x.filter = 'none';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function bubbleTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 180; const x = c.getContext('2d');
  x.fillStyle = '#fbfaf7'; x.beginPath(); x.roundRect(8, 8, 240, 130, 26); x.fill(); x.beginPath(); x.moveTo(60, 130); x.lineTo(40, 172); x.lineTo(100, 132); x.fill();
  x.fillStyle = '#9b98a8'; [88, 128, 168].forEach((X) => { x.beginPath(); x.arc(X, 73, 11, 0, 7); x.fill(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- landscape ----------
const land = new THREE.Group(); scene.add(land);
const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), felt('#2f7d2a')); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; land.add(ground);
const greens = ['#2f8a2c', '#3b9a33', '#27752a', '#4aa83c', '#36863a'];
// low rolling hills, and a height function so moss and flowers sit on them
const hills = [[-4.2, 0.8, 2.6, 0.32], [4.4, 0.6, 2.8, 0.3], [-1.8, 3.6, 2.2, 0.22], [2.0, 3.8, 2.4, 0.2], [0, -3.2, 3.8, 0.3], [-6.5, -2, 3, 0.4], [6.8, -2.5, 3, 0.42]];
const heightAt = (x, z) => hills.reduce((h, [hx, hz, r, sy]) => { const d2 = (x - hx) ** 2 + (z - hz) ** 2; return d2 < r * r ? Math.max(h, sy * Math.sqrt(r * r - d2)) : h; }, 0);
for (const [x, z, r, sy] of hills) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), felt(greens[Math.floor(rnd() * greens.length)])); m.scale.y = sy; m.position.set(x, 0, z); m.castShadow = m.receiveShadow = true; land.add(m);
}
// moss balls, dense like a cushion field
{
  const g = new THREE.SphereGeometry(1, 20, 14), n = 900, im = new THREE.InstancedMesh(g, felt('#ffffff'), n); const o = new THREE.Object3D(); const col = new THREE.Color();
  const mossCols = ['#2f8a2c', '#3b9a33', '#27752a', '#4aa83c', '#36863a', '#5bb548', '#226b25'];
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, d = 2.3 + Math.pow(rnd(), 0.7) * 8; const x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * 0.75 + 0.8; const s = 0.18 + rnd() * 0.32; o.position.set(x, heightAt(x, z) + s * 0.25, z); o.scale.set(s, s * 0.85, s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.set(mossCols[i % mossCols.length])); }
  im.castShadow = im.receiveShadow = true; land.add(im);
}
// flowers: stems and blooms; a ring of them blooms around the finished page later
const flowerCols = ['#ff6fa3', '#ff8a2a', '#b06cff', '#ffe14d', '#ffffff', '#ff4f5e', '#7fc8ff'];
function makeFlowers(n, place, scaleRange) {
  const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.016, 1, 6), clay('#3f8f35'), n);
  const bloom = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), felt('#ffffff'), n);
  const spike = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 3, 10), felt('#ffffff'), n);
  const data = []; const col = new THREE.Color();
  for (let i = 0; i < n; i++) { const [x, z] = place(i); const h = scaleRange[0] + rnd() * (scaleRange[1] - scaleRange[0]); data.push({ x, z, h, r: 0.07 + rnd() * 0.09, kind: rnd() < 0.22 ? 1 : 0, delay: rnd() }); const c = col.set(flowerCols[Math.floor(rnd() * flowerCols.length)]); bloom.setColorAt(i, c); spike.setColorAt(i, c); }
  stem.castShadow = bloom.castShadow = spike.castShadow = true;
  const o = new THREE.Object3D();
  const update = (grow) => data.forEach((f, i) => {
    const g = typeof grow === 'function' ? grow(f) : grow, h = f.h * g;
    const by = heightAt(f.x, f.z); o.position.set(f.x, by + h / 2, f.z); o.scale.set(1, Math.max(h, 1e-4), 1); o.rotation.set(0, 0, 0); o.updateMatrix(); stem.setMatrixAt(i, o.matrix);
    o.position.set(f.x, by + h, f.z); const s = f.r * g; o.scale.set(s, s * 0.8, s); o.updateMatrix(); bloom.setMatrixAt(i, f.kind ? new THREE.Matrix4().makeScale(0, 0, 0) : o.matrix);
    o.position.set(f.x, by + h + f.r * 1.2 * g, f.z); o.scale.set(s * 0.6, s * 0.6, s * 0.6); o.updateMatrix(); spike.setMatrixAt(i, f.kind ? o.matrix : new THREE.Matrix4().makeScale(0, 0, 0));
  }) || (stem.instanceMatrix.needsUpdate = bloom.instanceMatrix.needsUpdate = spike.instanceMatrix.needsUpdate = true);
  const g = new THREE.Group(); g.add(stem, bloom, spike); land.add(g);
  return { update: (grow) => { update(grow); stem.instanceMatrix.needsUpdate = bloom.instanceMatrix.needsUpdate = spike.instanceMatrix.needsUpdate = true; } };
}
// keep the camera's near ground and the closing spot for the girl clear
const clear = (x, z) => z > 4.4 || (Math.abs(x + 1.4) < 0.9 && z > 2.8);
const field = makeFlowers(650, () => { for (;;) { const a = rnd() * Math.PI * 2, d = 2.3 + Math.pow(rnd(), 0.7) * 8; const x = Math.cos(a) * d * 1.25, z = Math.sin(a) * d * 0.75 + 0.8; if (!clear(x, z)) return [x, z]; } }, [0.25, 0.8]);
field.update(1);
const ring = makeFlowers(200, (i) => { const side = i % 3; return side === 0 ? [-2.5 + rnd() * 5, 1.0 + rnd() * 1.4] : [(side === 1 ? -1 : 1) * (2.2 + rnd() * 0.8), -0.6 + rnd() * 2]; }, [0.35, 1.1]);
ring.update(0);
// trees and floating sheep
function tree(x, z, s, top) {
  const g = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.4, 10), clay('#9b6a4e')); trunk.position.y = 0.7; trunk.rotation.z = 0.12; g.add(trunk);
  for (const [px, py, pz, r] of [[0, 1.5, 0, 0.5], [0.35, 1.35, 0.1, 0.35], [-0.32, 1.4, -0.05, 0.35], [0.05, 1.75, 0, 0.32]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), felt(top)); b.position.set(px, py, pz); b.scale.y = 0.7; g.add(b); }
  g.position.set(x, 0, z); g.scale.setScalar(s); land.add(shadowy(g)); return g;
}
tree(-4.6, -0.8, 1.2, '#3f9a3a'); tree(4.7, -1.0, 1.3, '#2f8a33'); tree(-5.8, 1.2, 0.9, '#5aa6a8');
function sheep() { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 12), felt('#f7f4ee')); body.scale.set(1.2, 0.9, 0.9); g.add(body); const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), clay('#3a3430')); head.position.set(0.21, 0.02, 0); g.add(head); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), felt('#ffffff')); w.scale.set(0.5, 0.2, 1); w.position.set(-0.02, 0.15, s * 0.14); g.add(w); } scene.add(g); return g; }
const sheepA = sheep(), sheepB = sheep();
// sparkles
const sparkles = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: '#ffffff' })); scene.add(m); return m; });

// ---------- the page ----------
const PW = 4.2, PH = 2.6, PT = 0.12;
const pageG = new THREE.Group(); scene.add(pageG);
const slab = new THREE.Mesh(new RoundedBoxGeometry(PW, PH, PT, 4, 0.05), clay('#f4f1ea', { roughness: 0.6 })); slab.castShadow = slab.receiveShadow = true; pageG.add(slab);
const faceMat = new THREE.MeshStandardMaterial({ roughness: 0.7, emissive: '#ffffff', emissiveIntensity: 0 });
const face = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.12, PH - 0.12), faceMat); face.position.z = PT / 2 + 0.002; face.receiveShadow = true; pageG.add(face);
// on-page world: y is up from the page, z toward the front edge
const onPage = new THREE.Group(); onPage.rotation.x = Math.PI / 2; onPage.position.z = PT / 2 + 0.004; pageG.add(onPage);

// ---------- the girl: simple shapes with real joints ----------
function makeGirl() {
  const skin = clay('#f2c9a8'), coat = felt('#f0471c'), lime = felt('#b8e23c'), hair = clay('#1d1a1a');
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const capsule = (r, l, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m);
  const legs = [-1, 1].map((s) => { const hip = new THREE.Group(); hip.position.set(0.055 * s, 0.24, 0); const leg = capsule(0.034, 0.16, skin); leg.position.y = -0.11; hip.add(leg); const shoe = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), lime); shoe.scale.set(0.05, 0.035, 0.08); shoe.position.set(0, -0.215, 0.025); hip.add(shoe); body.add(hip); return hip; });
  const pts = [[0, 0.17], [0.19, 0.17], [0.215, 0.24], [0.2, 0.42], [0.165, 0.6], [0.12, 0.72], [0.06, 0.78], [0, 0.79]].map(([x, y]) => new THREE.Vector2(x, y));
  const coatM = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), coat); body.add(coatM);
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group(); sh.position.set(0.15 * s, 0.7, 0); const up = capsule(0.055, 0.13, coat); up.position.y = -0.1; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.2; sh.add(el); const fo = capsule(0.05, 0.1, coat); fo.position.y = -0.07; el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), skin); hand.position.y = -0.16; el.add(hand); body.add(sh); return { sh, el };
  });
  const head = new THREE.Group(); head.position.y = 0.9; body.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 28, 20), skin));
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.125, 28, 20), hair); hr.position.set(0, 0.01, -0.03); head.add(hr);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), hair); b.position.set(0.1 * s, -0.09, -0.04); head.add(b); const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), hair); e.position.set(0.042 * s, -0.005, 0.112); head.add(e); const ck = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), clay('#f59a8c')); ck.position.set(0.065 * s, -0.04, 0.1); ck.scale.z = 0.4; head.add(ck); }
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.14, 28, 20), lime); hat.position.y = 0.075; hat.scale.y = 0.85; head.add(hat);
  for (const s of [-1, 1]) { const ear = capsule(0.035, 0.08, lime); ear.position.set(0.055 * s, 0.24, 0); ear.rotation.z = -0.15 * s; head.add(ear); }
  shadowy(root); root.scale.setScalar(0.8);
  // pose: walk amount and phase, reach (arms forward), wave (right arm up)
  root.pose = ({ walk = 0, phase = 0, reach = 0, wave = 0, lean = 0 }) => {
    const s = Math.sin(phase);
    legs[0].rotation.x = -0.55 * s * walk; legs[1].rotation.x = 0.55 * s * walk;
    arms.forEach(({ sh, el }, i) => { const sw = (i ? -1 : 1) * 0.45 * s * walk; sh.rotation.set(lerp(sw, -1.35, reach), 0, (i ? 1 : -1) * 0.08); el.rotation.x = lerp(-0.15 * walk, -0.25, reach); });
    if (wave) { const { sh, el } = arms[1]; sh.rotation.set(0, 0, lerp(0.08, 2.5, wave)); el.rotation.set(0, 0, Math.sin(wave * 18) * 0.35 * wave); }
    body.position.y = Math.abs(s) * 0.035 * walk; body.rotation.z = s * 0.04 * walk; body.rotation.x = lean;
  };
  return root;
}
const girl = makeGirl(); onPage.add(girl);
const girl2 = makeGirl(); scene.add(girl2); girl2.scale.setScalar(0.95);

// wireframe cube
const cube = new THREE.Group(); {
  const m = clay('#f6f3ee', { roughness: 0.5 }), e = 0.34, r = 0.022;
  for (const [ax, a, b] of [['x', 1, 1], ['x', 1, -1], ['x', -1, 1], ['x', -1, -1], ['y', 1, 1], ['y', 1, -1], ['y', -1, 1], ['y', -1, -1], ['z', 1, 1], ['z', 1, -1], ['z', -1, 1], ['z', -1, -1]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 2 * e + 2 * r, 8), m);
    if (ax === 'x') { c.rotation.z = Math.PI / 2; c.position.set(0, a * e, b * e); } if (ax === 'y') c.position.set(a * e, 0, b * e); if (ax === 'z') { c.rotation.x = Math.PI / 2; c.position.set(a * e, b * e, 0); }
    cube.add(c);
  }
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r * 1.3, 10, 8), m); s.position.set(x * e, y * e, z * e); cube.add(s); }
  shadowy(cube); onPage.add(cube);
}
// glowing panel with speech bubbles
const panel = new THREE.Group(); onPage.add(panel);
const glowMat = new THREE.MeshStandardMaterial({ map: glowTexture(), emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.3 });
const glowEmap = glowMat.map; glowMat.emissiveMap = glowEmap;
const sheet = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.45, 0.04, 3, 0.02), glowMat); sheet.position.y = 0.78; sheet.castShadow = true; panel.add(sheet);
const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.85), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18 })); halo.position.set(0, 0.78, -0.03); panel.add(halo);
const bubTex = bubbleTexture();
const bubbles = [[-0.75, 1.5, 0.1], [0.75, 1.25, 0.1], [-0.7, 0.75, 0.15], [0.72, 0.55, 0.1]].map(([x, y, z]) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ map: bubTex, transparent: true, roughness: 0.8 })); b.position.set(x, y, z); panel.add(b); return b; });

// ---------- timeline ----------
const title = document.getElementById('title'), flash = document.getElementById('flash');
let dull, done;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const camAt = (pos, look) => { camera.position.copy(pos); camera.lookAt(look); };
function mixCam(t, keys) { // keys: [time, pos, look]
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  const [ta, pa, la] = keys[i], [tb, pb, lb] = keys[Math.min(i + 1, keys.length - 1)];
  const k = tb === ta ? 1 : ease((t - ta) / (tb - ta));
  camAt(pa.clone().lerp(pb, k), la.clone().lerp(lb, k));
}
function common(t) {
  sheepA.position.set(-2.8 + Math.sin(t * 0.6) * 0.3, 3.2 + Math.sin(t * 1.7) * 0.1, -1.5); sheepA.rotation.y = 0.4;
  sheepB.position.set(2.6 + Math.cos(t * 0.5) * 0.3, 3.0 + Math.sin(t * 1.4 + 1) * 0.1, -1.2); sheepB.rotation.y = 2.6;
}

function intro(t) {
  common(t);
  // page: upright among the hills, then tips into a floating floor, later stands up finished
  const tip = seg(t, 1.9, 3.4), rise = seg(t, 8.4, 9.4);
  pageG.position.set(0, lerp(lerp(1.45, 1.0, tip), 1.7, rise), lerp(lerp(-0.6, 0, tip), -0.4, rise));
  pageG.rotation.x = lerp(lerp(0, -Math.PI / 2, tip), 0, rise);
  pageG.rotation.z = Math.sin(lin(t, 1.9, 3.4) * Math.PI) * 0.08;
  faceMat.map = t < 7.75 ? dull : done; faceMat.needsUpdate = true;
  faceMat.emissiveIntensity = Math.max(0, 1 - Math.abs(t - 7.75) / 0.3) * 0.8;
  flash.style.opacity = Math.max(0, 1 - Math.abs(t - 7.75) / 0.25) * 0.85;
  sparkles.forEach((s, i) => { const k = clamp(Math.sin(lin(t, 2.2 + i * 0.12, 3.8 + i * 0.1) * Math.PI)); s.scale.setScalar(k * (1 + 0.3 * Math.sin(t * 20 + i))); s.position.set([-2.2, 2.3, 1.6, -1.2, 0.4, 2.0][i], [2.6, 2.4, 1.8, 2.9, 3.1, 1.4][i], [0.4, 0.2, 0.8, 0.3, 0.1, 1.0][i]); s.rotation.y = t * 3; });
  ring.update((f) => seg(t, 8.4 + f.delay * 0.6, 9.0 + f.delay * 0.6));
  // girl on the page (onPage coords: x right, z toward the front edge)
  let gx = -2.4, gz = 0.35, yaw = Math.PI / 2, walk = 0, phase = 0, reach = 0, lean = 0, gy = 0;
  if (t < 4.3) { const k = lin(t, 3.0, 4.3); gx = lerp(-2.4, -0.45, k); gz = lerp(0.35, 0.05, k); walk = k > 0 && k < 1 ? 1 : 0; phase = t * 9; }
  else if (t < 4.5) { gx = -0.45; gz = 0.05; reach = seg(t, 4.3, 4.5); }
  else if (t < 5.6) { const k = lin(t, 4.5, 5.6); gx = lerp(-0.45, 0.35, k); gz = 0.05; reach = 1; walk = 0.6; phase = t * 7; lean = 0.12; }
  else if (t < 6.3) { gx = lerp(0.35, 0.45, lin(t, 5.6, 6.3)); gz = 0.05; reach = 1 - seg(t, 5.6, 5.8) + seg(t, 6.1, 6.3); walk = 0; }
  else if (t < 7.75) { gx = 0.45; gz = 0.05; reach = 1; }
  else { const k = lin(t, 7.9, 8.5); yaw = lerp(Math.PI / 2, 0, seg(t, 7.75, 7.95)); gx = 0.45; gz = lerp(0.05, 1.9, k); gy = Math.sin(k * Math.PI) * 0.5 - k * k * 1.6; walk = k > 0 && k < 1 ? 0.4 : 0; phase = 1.2; }
  girl.position.set(gx, gy, gz); girl.rotation.y = yaw; girl.visible = t > 2.95 && t < 8.6; girl.pose({ walk, phase, reach, lean });
  const gIn = seg(t, 2.95, 3.2); girl.scale.setScalar(Math.max(0.8 * gIn, 1e-4));
  girl2.visible = false;
  // wireframe cube: pops up, is pushed, then turns into the glowing panel
  const cs = popScale(t, 3.5) * (1 - seg(t, 5.7, 6.0));
  cube.scale.setScalar(Math.max(cs, 1e-4)); cube.position.set(t < 4.5 ? 0.25 : lerp(0.25, 1.05, lin(t, 4.5, 5.6)), 0.37 * cs, 0.05); cube.rotation.y = 0.35;
  const ps = popScale(t, 5.85, 0.5) * (1 - seg(t, 7.6, 7.85)); panel.scale.setScalar(Math.max(ps, 1e-4)); panel.position.set(1.25, 0, 0.0); panel.rotation.y = -0.55;
  glowMat.emissiveIntensity = 0.35 + 0.35 * seg(t, 6.5, 7.5) + Math.sin(t * 6) * 0.05;
  bubbles.forEach((b, i) => { b.scale.setScalar(Math.max(popScale(t, 6.3 + i * 0.22, 0.35), 1e-4)); b.position.y += 0; b.rotation.z = Math.sin(t * 2 + i) * 0.04; });
  // camera
  mixCam(t, [
    [0, v3(0, 1.35, 6.0), v3(0, 1.35, 0)], [1.8, v3(0, 1.45, 5.8), v3(0, 1.4, 0)],
    [3.4, v3(0.8, 4.1, 5.4), v3(0.1, 0.9, 0)], [5.6, v3(1.2, 3.4, 4.4), v3(0.4, 1.05, 0)],
    [7.6, v3(1.0, 3.0, 3.9), v3(0.8, 1.35, 0)], [8.4, v3(0.6, 3.2, 5.6), v3(0.2, 1.2, 0)],
    [9.4, v3(0, 1.9, 8.0), v3(0, 1.7, 0)], [10.0, v3(0, 1.9, 8.0), v3(0, 1.7, 0)], [11, v3(0, 2.6, 8.0), v3(0, 8.5, 0)],
  ]);
  const n = seg(t, 10.2, 10.8);
  title.innerHTML = '<div class="h">Sketch2Site</div><div class="s">先畫草稿，再做成網站</div>';
  title.style.opacity = n; title.style.transform = `translateY(${(1 - n) * 30}px)`;
}

function outro(t) {
  common(t);
  pageG.position.set(0, 1.7, -0.4); pageG.rotation.set(0, 0, 0); faceMat.map = done; faceMat.needsUpdate = true; faceMat.emissiveIntensity = 0;
  flash.style.opacity = 0; sparkles.forEach((s) => s.scale.setScalar(1e-4)); ring.update(1);
  cube.scale.setScalar(1e-4); panel.scale.setScalar(1e-4); girl.visible = false;
  // the girl walks along the front hill and waves
  girl2.visible = true;
  const k = lin(t, 0.2, 2.0); const gx2 = lerp(-2.5, -1.15, k); girl2.position.set(gx2, heightAt(gx2, 3.5), 3.5);
  girl2.rotation.y = lerp(Math.PI / 2, 0.2, seg(t, 1.9, 2.3));
  girl2.pose({ walk: k > 0 && k < 1 ? 1 : 0, phase: t * 9, wave: seg(t, 2.2, 2.6) * (1 - seg(t, 3.6, 3.9)) });
  mixCam(t, [[0, v3(0, 1.9, 8.0), v3(0, 1.7, 0)], [3.2, v3(0, 1.9, 8.0), v3(0, 1.7, 0)], [4.4, v3(0, 2.6, 8.0), v3(0, 8.5, 0)]]);
  const n = seg(t, 4.0, 4.7);
  title.innerHTML = '<div class="h">Sketch2Site</div><div class="s">全隊　呂沛珍（中央大學資管三）</div><div class="k">MICROSOFT × NCU AI INNOVATION DEMO DAY</div>';
  title.style.opacity = n; title.style.transform = `translateY(${(1 - n) * 30}px)`;
}

window.ready = (async () => {
  await document.fonts.load('900 150px "Noto Sans TC"'); await document.fonts.load('500 44px "Noto Sans TC"'); await document.fonts.load('800 40px "Noto Sans TC"');
  dull = dullPage(); done = await finishedPage();
})();
window.run = (name, t) => { (name === 'outro' ? outro : intro)(t); renderer.render(scene, camera); };
