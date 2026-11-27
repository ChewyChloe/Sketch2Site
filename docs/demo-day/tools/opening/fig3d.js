// The rigged 3D girl (the user's model) drawn into a transparent canvas that stands on the CSS floor.
// Her legs and body come from the model's clips (walk, the crouch and the stand of lift_heavy);
// her arms are set by two-bone IK so both hands hold the thing she carries.
// The carried thing (the photo or the name) lives in this 3D scene too, so it moves with her hands:
// k = 0 lies on the floor in front of her, k = 1 is held (style 'tray' or 'overhead').
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const UNIT = 304; // CSS px per model unit on the page
const W = 1040, H = 380, SCALE = 2;
const canvas = document.createElement('canvas'); canvas.width = W * SCALE; canvas.height = H * SCALE;
canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(1.5, 3, 2.5); scene.add(sun);
const hw = W / UNIT / 2;
const cam = new THREE.OrthographicCamera(-hw, hw, 1.13, -0.12, 0.1, 20);
const pivot = new THREE.Group(); scene.add(pivot);

// the carried board: a 1 x 1 plane scaled to the thing's size
const tex = document.createElement('canvas'); const tctx = tex.getContext('2d');
const map = new THREE.CanvasTexture(tex); map.colorSpace = THREE.SRGBColorSpace;
const board = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide }));
pivot.add(board);
const photo = new Image(); photo.src = 'club-shadow.jpg';
function paint(kind, w, h, mix) {
  const cw = 1024, ch = Math.round(1024 * h / w);
  if (tex.width !== cw || tex.height !== ch) { tex.width = cw; tex.height = ch; }
  const x = tctx; x.globalAlpha = 1;
  if (kind === 'name') {
    x.fillStyle = '#f4f1ea'; x.fillRect(0, 0, cw, ch);
    x.fillStyle = '#0d0e11'; x.font = `900 ${Math.round(ch * 0.78)}px "Noto Sans TC"`; x.textBaseline = 'middle'; x.fillText('Sketch2Site', cw * 0.02, ch * 0.52);
  } else {
    x.fillStyle = '#d9d6cf'; x.fillRect(0, 0, cw, ch);
    x.strokeStyle = '#c4c0b8'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.lineTo(cw, ch); x.moveTo(cw, 0); x.lineTo(0, ch); x.stroke();
    if (mix > 0 && photo.complete) { x.globalAlpha = mix; const s = Math.max(cw / photo.width, ch / photo.height), iw = cw / s, ih = ch / s; x.drawImage(photo, (photo.width - iw) / 2, (photo.height - ih) / 2, iw, ih, 0, 0, cw, ch); }
  }
  map.needsUpdate = true;
}

let model, mixer, acts, hip, arms, thighs; const hp = new THREE.Vector3();
window.figReady = new GLTFLoader().loadAsync('girl-rig.glb').then((g) => {
  model = g.scene; pivot.add(model); hip = model.getObjectByName('Hip');
  model.traverse((o) => { o.frustumCulled = false; }); // skinned bounds go stale once the hips are moved back
  mixer = new THREE.AnimationMixer(model);
  const clip = (n) => g.animations.find((a) => a.name === n);
  acts = { walk: mixer.clipAction(clip('walk')), crouch: mixer.clipAction(clip('lift_heavy').clone()), idle: mixer.clipAction(clip('lift_heavy').clone()) };
  Object.values(acts).forEach((a) => { a.play(); a.paused = true; });
  const b = (n) => model.getObjectByName(n);
  thighs = [b('L_Thigh'), b('R_Thigh')];
  arms = ['L', 'R'].map((s) => ({ up: b(s + '_Upperarm'), fo: b(s + '_Forearm'), hand: b(s + '_Hand') }));
});

// ---- two-bone IK ----
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
function aim(bone, from, to) { // rotate bone so that the point `from` (world) moves toward `to` (world)
  const o = bone.getWorldPosition(new THREE.Vector3());
  _a.copy(from).sub(o).normalize(); _b.copy(to).sub(o).normalize();
  _q.setFromUnitVectors(_a, _b); bone.getWorldQuaternion(_wq); _q.multiply(_wq);
  bone.parent.getWorldQuaternion(_pq).invert(); bone.quaternion.copy(_pq.multiply(_q)); bone.updateMatrixWorld(true);
}
function reach({ up, fo, hand }, target, pole) {
  const S = up.getWorldPosition(new THREE.Vector3()), E = fo.getWorldPosition(new THREE.Vector3()), Hn = hand.getWorldPosition(new THREE.Vector3());
  const a = E.distanceTo(S), b = Hn.distanceTo(E), toT = target.clone().sub(S), d = Math.min(toT.length(), a + b - 1e-4);
  const u = toT.normalize(), cosA = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))), sinA = Math.sqrt(1 - cosA * cosA);
  const v = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  const Ed = S.clone().addScaledVector(u, a * cosA).addScaledVector(v, a * sinA);
  aim(up, E, Ed);
  aim(fo, hand.getWorldPosition(new THREE.Vector3()), S.clone().addScaledVector(u, d));
}

// board poses in pivot space (pivot = her facing; origin under her hips)
const UP = new THREE.Vector3(0, 1, 0);
function boardPose(k, yaw, w, h, style = 'tray') {
  const inv = new THREE.Quaternion().setFromAxisAngle(UP, -yaw);
  const worldX = new THREE.Vector3(1, 0, 0).applyQuaternion(inv), far = new THREE.Vector3(0, 0, -1).applyQuaternion(inv);
  // flat on the floor in front of her, long side along the page
  const fwd = new THREE.Vector3(0, 0, 1);
  const reachOut = 0.15 + Math.abs(fwd.dot(worldX)) * w / 2 + Math.abs(fwd.dot(far)) * h / 2;
  const flatPos = fwd.clone().multiplyScalar(reachOut).setY(0.01);
  const flatY = new THREE.Vector3().crossVectors(UP, worldX); // page-up on the board
  const flatQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(worldX, flatY, UP));
  // 'tray': flat at waist height on the camera side, she holds the edge next to her;
  // 'overhead': raised above her head facing the camera, held by its bottom edge
  const toCam = far.clone().negate();
  const heldPos = style === 'overhead' ? toCam.clone().multiplyScalar(0.02).setY(0.93 + h / 2) : toCam.clone().multiplyScalar(0.1 + h / 2).setY(0.45);
  const heldQ = style === 'overhead' ? new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(UP, toCam), UP, toCam)) : flatQ.clone();
  const heldGripY = style === 'overhead' ? -0.5 : 0.5;
  // the board edge nearest her while it lies flat, in board coordinates
  const fx = fwd.dot(worldX), fy = fwd.dot(flatY);
  const near = Math.abs(fx) > Math.abs(fy) ? { axis: 'x', at: -Math.sign(fx) * 0.5 } : { axis: 'y', at: -Math.sign(fy) * 0.5 };
  return { pos: flatPos.clone().lerp(heldPos, k), q: flatQ.clone().slerp(heldQ, k), flatPos: fwd.clone().multiplyScalar(reachOut), near, heldGripY };
}

window.fig3d = { canvas, W, H, UNIT,
  // where the flat board's centre sits relative to her feet, in page px (for matching the CSS element)
  flatOffset(yaw, w, h) { const p = boardPose(0, yaw, w, h, 'tray').flatPos.applyAxisAngle(UP, yaw); return [p.x * UNIT, p.z * UNIT]; },
  draw(elev, yaw, walk = 0, phase = 0, carry = null) {
    if (!model) return;
    const w = Math.min(1, walk), c = carry ? carry.crouch || 0 : 0;
    acts.walk.time = (phase * 0.12) % acts.walk.getClip().duration; acts.crouch.time = 6.2; acts.idle.time = 19.4;
    acts.walk.setEffectiveWeight(w * (1 - c)); acts.crouch.setEffectiveWeight(c); acts.idle.setEffectiveWeight((1 - w) * (1 - c));
    mixer.update(0);
    pivot.rotation.set(0, yaw, 0); model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); scene.updateMatrixWorld(true);
    // the clips turn her body differently (lift_heavy faces sideways); square her hips to face +z
    const l = thighs[0].getWorldPosition(new THREE.Vector3()), r = thighs[1].getWorldPosition(new THREE.Vector3());
    pivot.worldToLocal(l); pivot.worldToLocal(r);
    const ang = Math.atan2(r.z - l.z, r.x - l.x); // facing +z puts her right thigh toward -x: angle pi
    model.rotation.y = Math.atan2(Math.sin(ang - Math.PI), Math.cos(ang - Math.PI)); scene.updateMatrixWorld(true);
    hip.getWorldPosition(hp); pivot.worldToLocal(hp); model.position.x = -hp.x; model.position.z = -hp.z; // hips stay over the spot
    scene.updateMatrixWorld(true);
    board.visible = !!carry;
    if (carry) {
      const { pos, q } = boardPose(carry.k, yaw, carry.w, carry.h, carry.style);
      board.position.copy(pos); board.quaternion.copy(q); board.scale.set(carry.w, carry.h, 1);
      paint(carry.kind, carry.w, carry.h, carry.mix || 0);
      board.updateMatrixWorld(true);
      // grips: two points on the edge nearest her, on the floor and in her hands
      const { near, heldGripY } = boardPose(carry.k, yaw, carry.w, carry.h, carry.style);
      const grips = [-1, 1].map((s) => {
        const held = new THREE.Vector3(s * 0.15 / carry.w, heldGripY, carry.style === 'overhead' ? 0 : 0.03); // fingers over the edge
        const flat = near.axis === 'x' ? new THREE.Vector3(near.at, s * 0.12 / carry.h, 0) : new THREE.Vector3(s * 0.12 / carry.w, near.at, 0);
        return board.localToWorld(flat.lerp(held, carry.k));
      });
      const pole = new THREE.Vector3(0, -1, -0.4).applyQuaternion(pivot.quaternion);
      // each hand takes the grip on its own side
      const side = (p) => pivot.worldToLocal(p.clone()).x;
      const [gl, gr] = side(grips[0]) > side(grips[1]) ? grips : [grips[1], grips[0]];
      reach(arms[0], gl, pole.clone().add(new THREE.Vector3(0.5, 0, 0).applyQuaternion(pivot.quaternion)));
      reach(arms[1], gr, pole.clone().add(new THREE.Vector3(-0.5, 0, 0).applyQuaternion(pivot.quaternion)));
      // window.ikdbg = [gl, gr].map((g, i) => [g.toArray().map((v) => +v.toFixed(3)), arms[i].hand.getWorldPosition(new THREE.Vector3()).toArray().map((v) => +v.toFixed(3)), arms[i].up.getWorldPosition(new THREE.Vector3()).toArray().map((v) => +v.toFixed(3))]);
    }
    const el = elev * Math.PI / 180;
    cam.position.set(0, Math.sin(el) * 5, Math.cos(el) * 5); cam.lookAt(0, 0, 0);
    renderer.render(scene, cam);
  } };
