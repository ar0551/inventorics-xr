import * as THREE from "three";

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  camera.position.set(1.8, 1.2, 2.4);
  return camera;
}
