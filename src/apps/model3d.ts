import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { h } from '../core/dom';
import type { FsFile } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';

/**
 * Visionneuse .glb (les fichiers « .blend » de la base pointent vers des .glb).
 * Rendu calé sur l'ancien three r126 : sortie linéaire et lumières « legacy » × π.
 */
export async function open(os: Os, file: FsFile): Promise<void> {
  const { win, created } = os.wm.open({ key: `file:${file.id}`, title: file.name, icon: fileIcon(file) });
  if (!created) return;

  const status = h('div', { class: 'viewer3d-status', text: 'LOADING...' });
  const container = h('div', { class: 'content viewer3d' }, status);
  win.body.append(container);
  const { signal } = win;

  const width = () => Math.max(1, container.clientWidth);
  const height = () => Math.max(1, container.clientHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, width() / height(), 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width(), height());
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  let raf = 0;
  let disposed = false;
  const resize = new ResizeObserver(() => {
    renderer.setSize(width(), height());
    camera.aspect = width() / height();
    camera.updateProjectionMatrix();
  });
  resize.observe(container);

  win.onDispose(() => {
    disposed = true;
    cancelAnimationFrame(raf);
    resize.disconnect();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const m of mats) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
  });

  let gltf: Awaited<ReturnType<GLTFLoader['loadAsync']>>;
  try {
    gltf = await new GLTFLoader().loadAsync(file.url ?? '', (e) => {
      if (e.total) status.textContent = `LOADING ${Math.round((e.loaded / e.total) * 100)}%`;
    });
  } catch (err) {
    console.error(err);
    status.textContent = 'ERREUR : modèle introuvable.';
    status.classList.add('app-error');
    return;
  }
  if (disposed) return;
  status.remove();

  const model = gltf.scene;
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  model.rotation.set(0, Math.PI / 2, 0);
  model.scale.set(1, 1, 1);
  model.position.set(0, 5, 0);
  scene.add(model);

  const point = new THREE.PointLight(0xffffff, 0.72 * Math.PI, 100, 0);
  point.position.set(0, 20, 20);
  scene.add(point);
  scene.add(new THREE.AmbientLight(0x404040, Math.PI));

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  camera.position.set(center.x, center.y + size * 0.5, center.z + size * 0.5);
  camera.lookAt(center);

  const mixer = new THREE.AnimationMixer(model);
  for (const clip of gltf.animations) mixer.clipAction(clip).setDuration(4).play();

  const clock = new THREE.Clock();
  const loop = () => {
    raf = requestAnimationFrame(loop);
    mixer.update(clock.getDelta());
    renderer.render(scene, camera);
  };
  loop();

  // Rotation au glisser (souris ou doigt), zoom molette ou pinch.
  const zoom = (amount: number) => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    camera.position.addScaledVector(dir.normalize(), amount);
  };
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
  }, { signal });
  canvas.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);
    if (pointers.size === 1) {
      model.rotation.y += (cur.x - prev.x) * 0.01;
      model.rotation.x += (cur.y - prev.y) * 0.01;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch) zoom((d / pinch - 1) * size * 0.5);
      pinch = d;
    }
  }, { signal });
  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
  };
  canvas.addEventListener('pointerup', end, { signal });
  canvas.addEventListener('pointercancel', end, { signal });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(e.deltaY * 0.05); // même sens que l'ancien site
  }, { passive: false, signal });
}
