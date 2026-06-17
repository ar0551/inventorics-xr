import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { APP_CONFIG } from "../app/config.js";

export async function loadModel({ visible = false } = {}) {
  const loader = new GLTFLoader();
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
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  const distance = maxSize * 1.8;

  model.position.sub(center);
  camera.position.set(distance, distance * 0.55, distance);
  camera.near = maxSize / 100;
  camera.far = maxSize * 20;
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.update();
}
