import * as THREE from "three";
import { addLights } from "./lights.js";

export function createScene({ background = null } = {}) {
  const scene = new THREE.Scene();
  scene.background = background;
  addLights(scene);
  return scene;
}
