import * as THREE from "three";

export function createRenderer({ alpha = true } = {}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  return renderer;
}
