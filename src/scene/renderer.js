import * as THREE from "three";

export function createRenderer({ alpha = true } = {}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha,
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  return renderer;
}
