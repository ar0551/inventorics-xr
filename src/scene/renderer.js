import * as THREE from "three";

export function createRenderer({ alpha = true } = {}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha,
    premultipliedAlpha: true,
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, alpha ? 0 : 1);
  renderer.xr.enabled = true;

  return renderer;
}
