// 3D developer's room (World Labs Atlas splat) for the intro scene.
// Video/poster stay visible as fallback; the splat fades in once ready.
import * as THREE from "three";
import { SplatMesh } from "@sparkjsdev/spark";

const stage = document.querySelector("[data-room-stage]");
const canWebGL = (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })();
const saveData = navigator.connection?.saveData;
const small = matchMedia("(max-width:620px)").matches;

if (stage && canWebGL && !saveData && !small) init();

async function init() {
  const holder = stage.querySelector(".room-canvas");
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // First Atlas camera (front composition). RUB coords = three.js default.
  const BASE_POS = new THREE.Vector3(-0.569, 0.934, -0.759);
  const BASE_Q = new THREE.Quaternion(-0.0266, 0.3161, 0.0109, 0.9483);
  const camera = new THREE.PerspectiveCamera(47, 1, 0.01, 100);
  const baseEuler = new THREE.Euler().setFromQuaternion(BASE_Q, "YXZ");
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(BASE_Q);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(BASE_Q);
  const at = (f, r, u) => BASE_POS.clone().addScaledVector(fwd, f).addScaledVector(right, r).add(new THREE.Vector3(0, u, 0));

  // room.spz is split into <25MB parts (GitHub upload limit) and re-joined here.
  const PARTS = ["room.spz.part-aa", "room.spz.part-ab", "room.spz.part-ac"].map((f) => `assets/dev-room/${f}`);
  let loaded = false;
  const room = await Promise.all(PARTS.map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.arrayBuffer(); })))
    .then((bufs) => {
      const out = new Uint8Array(bufs.reduce((n, b) => n + b.byteLength, 0));
      let o = 0; for (const b of bufs) { out.set(new Uint8Array(b), o); o += b.byteLength; }
      return new SplatMesh({ fileBytes: out.buffer });
    })
    .catch(() => null);
  if (!room) return; // keep the video fallback
  scene.add(room);
  Promise.resolve(room.initialized).then(() => setTimeout(() => (loaded = true), 600)).catch(() => {});

  const hots = [...stage.querySelectorAll("[data-hot]")].map((el) => {
    const [f, r, u] = el.dataset.hot.split(",").map(Number);
    return { el, p: at(f, r, u) };
  });

  let w = 1, h = 1, yawBase = 0;
  const resize = () => {
    w = holder.clientWidth || 1; h = holder.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the desk framed on tall/narrow screens
    camera.fov = w / h < 1.3 ? 58 : 47;
    // wide screens: turn left a bit so the desk sits right of the intro copy
    yawBase = w / h > 1.3 ? -0.3 : 0;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(holder); resize();

  let yaw = 0, pitch = 0, tYaw = 0, tPitch = 0, drag = false, lx = 0, ly = 0, idle = 0, mx = 0, my = 0;
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", (e) => { drag = true; lx = e.clientX; ly = e.clientY; idle = 0; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointerup", () => (drag = false));
  cv.addEventListener("pointermove", (e) => {
    const r = cv.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5;
    if (!drag) return;
    tYaw = Math.max(-1.2, Math.min(1.2, tYaw + (e.clientX - lx) * 0.004));
    tPitch = Math.max(-0.45, Math.min(0.45, tPitch + (e.clientY - ly) * 0.003));
    lx = e.clientX; ly = e.clientY; idle = 0;
  });

  let visible = true;
  new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0.05 }).observe(stage);

  const v = new THREE.Vector3();
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const t0 = performance.now();
  let ready = false;

  renderer.setAnimationLoop((now) => {
    if (!visible) return;
    const t = (now - t0) / 1000;
    if (!drag && (idle += 1 / 60) > 3 && !reduce) {
      // gentle parallax toward the cursor + slow breathing drift
      tYaw += (mx * 0.35 + Math.sin(t * 0.13) * 0.06 - tYaw) * 0.02;
      tPitch += (my * 0.12 - tPitch) * 0.02;
    }
    yaw += (tYaw - yaw) * 0.08; pitch += (tPitch - pitch) * 0.08;
    camera.quaternion.setFromEuler(new THREE.Euler(baseEuler.x - pitch, baseEuler.y - yaw - yawBase, 0, "YXZ"));
    camera.position.copy(BASE_POS).addScaledVector(fwd, reduce ? 0 : Math.sin(t * 0.4) * 0.012);
    renderer.render(scene, camera);

    for (const { el, p } of hots) {
      v.copy(p).project(camera);
      const on = ready && v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.9;
      el.classList.toggle("is-on", on);
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    }
    if (!ready && loaded) {
      ready = true;
      stage.classList.add("is-3d");
    }
  });
}
