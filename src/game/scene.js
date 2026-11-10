/**
 * scene.js — Three.js scene setup.
 *
 * Creates renderer, camera, lights, and render loop.
 * Returns helpers the rest of the app can call.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── Shared constants ─────────────────────────────────────────────
export const TILE = 1.1; // world-space size of one grid tile (re-exported for convenience)

// ── Shared colours ──────────────────────────────────────────────
export const COLORS = {
  floor:     0x1e2a3a,
  floorLine: 0x2a3f55,
  wall:      0x1a2545,
  wallTop:   0x243060,
  gem:       0x4ee5c4,
  gemGlow:   0x2af5cc,
  goal:      0xf7c56a,
  goalGlow:  0xffde8a,
  robot:     0x7c6af7,
  robotHead: 0x9381ff,
  robotEye:  0xffffff,
};

export function createScene(canvas) {
  /* ── Renderer ─────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0a0c18);

  /* ── Scene ───────────────────────────────────────────────── */
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0c18, 20, 60);

  /* ── Camera (isometric-style perspective) ────────────────── */
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(8, 10, 12);
  camera.lookAt(0, 0, 0);

  /* ── OrbitControls ───────────────────────────────────────── */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.08;
  controls.minDistance    = 5;
  controls.maxDistance    = 25;
  controls.maxPolarAngle  = Math.PI / 2.2;  // don't go below horizon
  controls.target.set(0, 0, 0);

  /* ── Lights ──────────────────────────────────────────────── */
  const ambient = new THREE.AmbientLight(0x334466, 1.2);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffeedd, 1.6);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far  = 60;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -20;
  sun.shadow.camera.right = sun.shadow.camera.top   =  20;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x334488, 0.6);
  fill.position.set(-6, 8, -4);
  scene.add(fill);

  /* ── Resize handler ──────────────────────────────────────── */
  function resize() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Render loop ─────────────────────────────────────────── */
  let _animId = null;
  const clock = new THREE.Clock();

  function loop() {
    _animId = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  }
  loop();

  return {
    scene,
    camera,
    renderer,
    controls,
    resize,
    dispose() {
      cancelAnimationFrame(_animId);
      window.removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
    },
  };
}
