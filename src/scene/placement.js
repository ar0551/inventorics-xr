import * as THREE from "three";
import { APP_CONFIG } from "../app/config.js";
import { applyModelConfig } from "./model.js";

export function placeModelAtMatrix(model, referenceMatrix) {
  const base = new THREE.Object3D();
  base.matrixAutoUpdate = false;
  base.matrix.copy(referenceMatrix);
  base.matrix.decompose(base.position, base.quaternion, base.scale);

  const offset = new THREE.Vector3(
    APP_CONFIG.placement.offset.x,
    APP_CONFIG.placement.offset.y,
    APP_CONFIG.placement.offset.z
  );

  offset.applyQuaternion(base.quaternion);

  applyModelConfig(model);
  model.position.add(base.position).add(offset);
  model.quaternion.premultiply(base.quaternion);
  model.rotateY(APP_CONFIG.placement.rotationY);
  model.visible = true;
}

export function placeModelAtWorldOrigin(model) {
  placeModelAtMatrix(model, new THREE.Matrix4());
}
