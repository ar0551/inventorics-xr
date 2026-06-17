import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { APP_CONFIG } from "../app/config.js";

let dracoLoader = null;

export async function loadModel({ visible = false } = {}) {
  const loader = new GLTFLoader();
  loader.setDRACOLoader(getDracoLoader());

  const gltf = await loader.loadAsync(APP_CONFIG.model.url);
  const model = gltf.scene;

  applyModelConfig(model);
  model.visible = visible;

  model.traverse((child) => {
    if (child.isMesh) {
      child.frustumCulled = false;
      if (child.material) {
        child.material.needsUpdate = true;
      }
    }
  });

  return model;
}

function getDracoLoader() {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(APP_CONFIG.model.dracoDecoderPath);
  }

  return dracoLoader;
}

export function applyModelConfig(model) {
  model.scale.setScalar(APP_CONFIG.model.scale);
  model.position.set(
    APP_CONFIG.model.position.x,
    APP_CONFIG.model.position.y,
    APP_CONFIG.model.position.z
  );
  model.rotation.set(
    APP_CONFIG.model.rotation.x,
    APP_CONFIG.model.rotation.y,
    APP_CONFIG.model.rotation.z
  );
}

export function frameModelForViewer(model, camera, controls) {
  applyModelConfig(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const safeSize = Number.isFinite(maxSize) && maxSize > 0 ? maxSize : 1;
  const distance = THREE.MathUtils.clamp(safeSize * 1.8, 0.25, 50);

  model.position.sub(center);
  camera.position.set(distance, distance * 0.55, distance);
  camera.near = Math.max(distance / 1000, 0.001);
  camera.far = Math.max(distance * 20, 100);
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.minDistance = Math.max(distance / 20, 0.01);
  controls.maxDistance = Math.max(distance * 8, 2);
  controls.update();

  return {
    size,
    center,
    maxSize: safeSize,
    distance,
  };
}
