// The 3D character drawn into a small transparent canvas that stands on the CSS floor.
// The model is one mesh without a skeleton, so it gets a simple one here, read from its shape:
// shoulders at (±0.10, 0.68), sleeves down to the cuffs (±0.145, 0.45) and hands (±0.125, 0.37),
// legs below the coat hem (y < 0.10) hinged at hips inside the coat (±0.035, 0.28).
// Each vertex follows a bone by a smooth weight (distance to the bone), so the coat bends, not tears.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const W = 190, H = 380, SCALE = 2;
const canvas = document.createElement('canvas'); canvas.width = W * SCALE; canvas.height = H * SCALE;
canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(1.5, 3, 2.5); scene.add(sun);
const span = 1.25, aspect = W / H;
const cam = new THREE.OrthographicCamera(-span * aspect / 2, span * aspect / 2, 1.13, -0.12, 0.1, 20);
const pivot = new THREE.Group(); scene.add(pivot);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function distToPolyline(p, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], ab = b.clone().sub(a), t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq()));
    best = Math.min(best, a.clone().addScaledVector(ab, t).distanceTo(p));
  }
  return best;
}
let model, mesh, base, baseN, rig;
window.figReady = new GLTFLoader().loadAsync('girl.glb').then((g) => {
  model = g.scene; pivot.add(model);
  model.traverse((o) => { if (o.isMesh) mesh = o; });
  const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal;
  base = pos.array.slice(); baseN = nor.array.slice();
  const n = pos.count, armW = new Float32Array(n), foreW = new Float32Array(n), legW = new Float32Array(n), side = new Int8Array(n);
  const v = new THREE.Vector3();
  // sleeve centre line by height: shoulder 0.68 → elbow 0.55 → cuff 0.44 → hand 0.35
  const line = [[0.68, 0.10], [0.55, 0.128], [0.44, 0.145], [0.35, 0.125]];
  const cx = (y) => { for (let k = 0; k < line.length - 1; k++) { const [y0, x0] = line[k], [y1, x1] = line[k + 1]; if (y <= y0 && y >= y1) return x0 + (x1 - x0) * (y0 - y) / (y0 - y1); } return null; };
  // the texture tells skin from coat: hands are skin-coloured, the skirt beside them is not
  const img = mesh.material.map.image, tc = document.createElement('canvas'); tc.width = img.width; tc.height = img.height;
  const tx = tc.getContext('2d'); tx.drawImage(img, 0, 0); const px = tx.getImageData(0, 0, tc.width, tc.height).data;
  const uv = mesh.geometry.attributes.uv;
  const skin = (i) => { const u = uv.getX(i), w = uv.getY(i); const X = Math.min(tc.width - 1, Math.max(0, Math.floor(u * tc.width))), Y = Math.min(tc.height - 1, Math.max(0, Math.floor(w * tc.height))); const k = (Y * tc.width + X) * 4; return px[k] > 150 && px[k + 1] > 115 && px[k + 2] > 85; };
  for (let i = 0; i < n; i++) {
    v.fromArray(base, i * 3); const s = v.x < 0 ? -1 : 1; side[i] = s;
    const c = cx(v.y);
    if (c !== null) {
      // the outer half of the sleeve moves fully; toward the body it fades within 2 cm,
      // and the coat's front and back panels (larger |z|) stay with the body
      const inward = Math.max(0, c - Math.abs(v.x));
      armW[i] = (1 - smooth(0.01, 0.04, inward)) * (1 - smooth(0.03, 0.075, Math.abs(v.z))) * smooth(0.665, 0.6, v.y);
      foreW[i] = smooth(0.57, 0.5, v.y);
    }
    legW[i] = (1 - smooth(0.085, 0.105, v.y)) * smooth(0.004, 0.012, Math.abs(v.x));
  }
  // soften the weights along the surface so neighbouring vertices move together
  const idx = mesh.geometry.index.array, key = new Map(), rep = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = base[i*3].toFixed(5) + ',' + base[i*3+1].toFixed(5) + ',' + base[i*3+2].toFixed(5); if (!key.has(k)) key.set(k, i); rep[i] = key.get(k); }
  const nb = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) { const x = rep[idx[t + a]], y = rep[idx[t + b]]; if (x !== y) { nb[x].add(y); nb[y].add(x); } }
  for (let it = 0; it < 3; it++) {
    const next = armW.slice();
    for (let i = 0; i < n; i++) if (rep[i] === i && nb[i].size) { let sum = armW[i]; for (const j of nb[i]) sum += armW[j]; next[i] = sum / (nb[i].size + 1); }
    for (let i = 0; i < n; i++) armW[i] = next[rep[i]];
  }
  rig = { n, armW, foreW, legW, side };
});
const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), nn = new THREE.Vector3();
function pose(walk, phase, push) {
  const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal;
  const swing = Math.sin(phase);
  for (let i = 0; i < rig.n; i++) {
    p.fromArray(base, i * 3); nn.fromArray(baseN, i * 3);
    const s = rig.side[i];
    if (rig.legW[i] > 0) { // hips: one leg forward while the other goes back
      const a = rig.legW[i] * walk * 0.38 * swing * s;
      q.setFromEuler(e.set(-a, 0, 0)); p.y -= 0.28; p.x -= 0.035 * s; p.applyQuaternion(q); p.y += 0.28; p.x += 0.035 * s; nn.applyQuaternion(q);
    } else if (rig.armW[i] > 0) { // shoulder swing, then the forearm bends at the elbow
      const w = rig.armW[i];
      const flex = walk * 0.22 * -swing * s; // kept small: the sleeves are fused to the coat
      const bend = walk * 0.1;
      const open = 0;
      if (rig.foreW[i] > 0) {
        q.setFromEuler(e.set(-bend * w * rig.foreW[i], 0, 0));
        p.x -= 0.128 * s; p.y -= 0.55; p.applyQuaternion(q); p.x += 0.128 * s; p.y += 0.55; nn.applyQuaternion(q);
      }
      q.setFromEuler(e.set(-flex * w, 0, open * w * s, 'ZXY'));
      p.x -= 0.10 * s; p.y -= 0.68; p.applyQuaternion(q); p.x += 0.10 * s; p.y += 0.68; nn.applyQuaternion(q);
    }
    p.toArray(pos.array, i * 3); nn.toArray(nor.array, i * 3);
  }
  pos.needsUpdate = true; nor.needsUpdate = true;
}
window.fig3d = { canvas, W, H, draw(elev, yaw, sway, lean, walk = 0, phase = 0, push = 0) {
  if (!model) return;
  pose(walk, phase, push);
  pivot.rotation.set(0, yaw, 0); model.rotation.set(lean + push * 0.14, 0, sway); // pushing: lean into it
  const el = elev * Math.PI / 180;
  cam.position.set(0, Math.sin(el) * 5, Math.cos(el) * 5); cam.lookAt(0, 0, 0);
  renderer.render(scene, cam);
} };
