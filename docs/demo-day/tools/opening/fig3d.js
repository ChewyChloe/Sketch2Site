// The 3D character drawn into a small transparent canvas that stands on the CSS floor.
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
let model;
window.figReady = new GLTFLoader().loadAsync('girl.glb').then((g) => { model = g.scene; pivot.add(model); });
window.fig3d = { canvas, W, H, draw(elev, yaw, sway, lean) {
  if (!model) return;
  pivot.rotation.set(0, yaw, 0); model.rotation.set(lean, 0, sway);
  const e = elev * Math.PI / 180;
  cam.position.set(0, Math.sin(e) * 5, Math.cos(e) * 5); cam.lookAt(0, 0, 0);
  renderer.render(scene, cam);
} };
