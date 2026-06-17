import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createCamera } from "./camera.js";
import { createRenderer } from "./renderer.js";
import { createScene } from "./scene.js";
import { frameModelForViewer, loadModel } from "./model.js";
import { clearElement, createElement, getAppRoot } from "../utils/dom.js";

export async function startFallbackViewer(state, { onBack } = {}) {
  const root = getAppRoot();
  clearElement(root);

  const shell = createElement("main", { className: "viewer-shell" });
  const toolbar = createElement("div", { className: "viewer-toolbar" });
  const title = createElement("div", {
    className: "viewer-title",
    text: "Inventorics XR 3D Viewer",
  });
  const backButton = createElement("button", {
    className: "button button-secondary",
    text: "Back",
    type: "button",
  });
  const canvasHost = createElement("div", { className: "viewer-canvas" });
  const status = createElement("div", {
    className: "viewer-status",
    text: "Loading model...",
  });

  toolbar.append(title, backButton);
  shell.append(toolbar, canvasHost, status);
  root.append(shell);

  const scene = createScene({ background: new THREE.Color(0xf3f4f6) });
  const camera = createCamera();
  const renderer = createRenderer({ alpha: false });
  renderer.xr.enabled = false;
  canvasHost.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.6, 0);

  const grid = new THREE.GridHelper(4, 16, 0x9ca3af, 0xd1d5db);
  scene.add(grid);

  let disposed = false;

  function resize() {
    const width = canvasHost.clientWidth || window.innerWidth;
    const height = canvasHost.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function dispose() {
    disposed = true;
    window.removeEventListener("resize", resize);
    renderer.setAnimationLoop(null);
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  state.activeExperience = { dispose };
  backButton.addEventListener("click", () => {
    dispose();
    if (onBack) onBack();
  });

  window.addEventListener("resize", resize);
  resize();

  try {
    const model = await loadModel({ visible: true });
    scene.add(model);
    frameModelForViewer(model, camera, controls);
    status.hidden = true;
  } catch (error) {
    console.error(error);
    status.textContent =
      "The 3D model could not be loaded. Check that the GLB exists in public/models.";
  }

  renderer.setAnimationLoop(() => {
    if (disposed) return;
    controls.update();
    renderer.render(scene, camera);
  });
}
