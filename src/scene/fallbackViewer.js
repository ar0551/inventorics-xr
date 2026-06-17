import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createCamera } from "./camera.js";
import { createRenderer } from "./renderer.js";
import { createScene } from "./scene.js";
import { applyModelConfig, frameModelForViewer, loadModel } from "./model.js";
import { clearElement, createElement, getAppRoot } from "../utils/dom.js";

export async function startFallbackViewer(state, { onBack, onEnterAR } = {}) {
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
  const enterARButton = createElement("button", {
    className: "button button-primary",
    text: "Enter AR",
    type: "button",
  });
  enterARButton.disabled = true;
  enterARButton.hidden = !onEnterAR;
  const canvasHost = createElement("div", { className: "viewer-canvas" });
  const status = createElement("div", {
    className: "viewer-status",
    text: "Loading model...",
  });

  const toolbarActions = createElement("div", { className: "viewer-actions" });
  toolbarActions.append(enterARButton, backButton);
  toolbar.append(title, toolbarActions);
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
  grid.position.set(0, 0, 0);
  scene.add(grid);

  const originAxes = new THREE.AxesHelper(0.5);
  originAxes.position.set(0, 0, 0);
  scene.add(originAxes);

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
  enterARButton.addEventListener("click", () => {
    if (!onEnterAR || enterARButton.disabled) return;
    dispose();
    onEnterAR();
  });

  window.addEventListener("resize", resize);
  resize();

  try {
    const sourceModel = state.loadedModel || (await loadModel({ visible: false }));
    state.loadedModel = sourceModel;
    applyModelConfig(sourceModel);
    sourceModel.visible = false;

    const viewerModel = sourceModel.clone(true);
    viewerModel.visible = true;
    scene.add(viewerModel);
    const frame = frameModelForViewer(viewerModel, camera, controls);
    status.textContent = `Model loaded (${formatMeters(frame.size.x)} x ${formatMeters(frame.size.y)} x ${formatMeters(frame.size.z)}).`;
    status.classList.add("viewer-status-loaded");
    enterARButton.disabled = false;
  } catch (error) {
    console.error(error);
    status.textContent = `The 3D model could not be loaded. ${getLoadErrorMessage(error)}`;
  }

  renderer.setAnimationLoop(() => {
    if (disposed) return;
    controls.update();
    renderer.render(scene, camera);
  });
}

function getLoadErrorMessage(error) {
  const message = error?.message || String(error);

  if (message.includes("DRACOLoader")) {
    return "This model uses Draco compression, but the decoder could not be loaded.";
  }

  if (message.includes("404") || message.includes("Not Found")) {
    return "Check that the GLB exists in public/models.";
  }

  return message;
}

function formatMeters(value) {
  if (!Number.isFinite(value)) return "? m";
  if (value < 1) return `${Math.round(value * 100)} cm`;
  return `${value.toFixed(2)} m`;
}
