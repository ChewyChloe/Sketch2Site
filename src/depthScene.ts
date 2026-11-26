import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// A picture turned into a 3D object on request (a note like 做成 3D). Loaded only when a page
// uses it. "float": a thick card that drifts and leans toward the pointer. "turntable": the card
// stands on a round base and turns slowly; dragging turns it by hand. Everything stops while the
// element is off screen, and the caller keeps the plain picture as the fallback.

export type DepthMode = "float" | "turntable";

function softShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  r.addColorStop(0, "rgba(0,0,0,0.34)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createDepthScene(host: HTMLElement, image: HTMLImageElement, mode: DepthMode, tint: string): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.className = "depth-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  const back = texture.clone();
  back.wrapS = THREE.RepeatWrapping;
  back.repeat.x = -1;
  back.needsUpdate = true;
  const ratio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 4 / 3;
  const w = ratio >= 1 ? 2 : 2 * ratio, h = ratio >= 1 ? 2 / ratio : 2;
  const edge = new THREE.MeshStandardMaterial({ color: 0xf3f2ee, roughness: 0.6, metalness: 0 });
  // The picture keeps its own colours; light only shapes the edges and the base.
  const face = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, toneMapped: false });
  const card = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), [edge, edge, edge, edge, face(texture), face(back)]);
  const group = new THREE.Group();
  group.add(card);
  scene.add(group);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, w * 0.5), new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  let base: THREE.Mesh | null = null;
  if (mode === "turntable") {
    base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.62, w * 0.66, 0.16, 64), new THREE.MeshStandardMaterial({ color: new THREE.Color(tint), roughness: 0.55 }));
    base.position.y = -h / 2 - 0.1;
    scene.add(base);
    shadow.position.y = -h / 2 - 0.19;
    shadow.scale.set(1, 2.2, 1);
    camera.position.set(0, 0.5, 7.4);
    camera.lookAt(0, -0.25, 0);
  } else {
    shadow.position.y = -h / 2 - 0.35;
    camera.position.set(0, 0, 6.2);
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdcd6cc, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  scene.add(key);

  // Pointer: the float card leans toward it; the turntable can be dragged.
  let px = 0, py = 0, drag: number | null = null, spin = 0, spinV = 0.5;
  const move = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width) * 2 - 1;
    py = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (drag !== null) { spin += (e.clientX - drag) * 0.012; drag = e.clientX; }
  };
  const down = (e: PointerEvent) => { if (mode === "turntable") { drag = e.clientX; host.setPointerCapture?.(e.pointerId); } };
  const up = () => { drag = null; };
  const leave = () => { px = 0; py = 0; drag = null; };
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerdown", down);
  host.addEventListener("pointerup", up);
  host.addEventListener("pointerleave", leave);

  const size = () => {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    // The card fills about four fifths of the box, whatever its shape.
    const span = 2 * Math.tan((camera.fov * Math.PI) / 360);
    const fill = mode === "turntable" ? 0.66 : 0.8;
    const height = mode === "turntable" ? h + 0.5 : h;
    camera.position.z = Math.max(w / (fill * span * camera.aspect), height / (fill * span));
    camera.updateProjectionMatrix();
  };
  size();
  const ro = new ResizeObserver(size);
  ro.observe(host);

  let raf = 0, visible = true, last = performance.now(), rx = 0, ry = 0;
  const frame = (now: number) => {
    raf = 0;
    if (!visible) return;
    const t = now / 1000;
    last = now;
    if (mode === "float") {
      rx += (py * 0.22 - rx) * 0.08;
      ry += (px * 0.34 - ry) * 0.08;
      group.rotation.set(rx, ry + Math.sin(t * 0.6) * 0.06, Math.sin(t * 0.4) * 0.015);
      group.position.y = Math.sin(t * 1.1) * 0.06;
      shadow.scale.set(1 - group.position.y * 0.6, 1, 1);
    } else {
      // Turns back and forth so the picture keeps facing the viewer; dragging adds a turn.
      if (drag === null) spin *= 0.96;
      group.rotation.y = Math.sin(t * spinV) * 0.9 + spin;
      group.position.y = 0.02 * Math.sin(t);
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  io.observe(host);
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    host.removeEventListener("pointermove", move);
    host.removeEventListener("pointerdown", down);
    host.removeEventListener("pointerup", up);
    host.removeEventListener("pointerleave", leave);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); });
    });
    env.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    spinV = 0;
  };
}
