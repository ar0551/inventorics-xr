import * as THREE from "three";
import { APP_CONFIG } from "../app/config.js";
import { createAlignmentGuide } from "../scene/alignmentGuide.js";
import { applyModelConfig, loadModel } from "../scene/model.js";
import { createRenderer } from "../scene/renderer.js";
import { createScene } from "../scene/scene.js";
import {
  ensureOverlay,
  removeOverlay,
  setOverlayMode,
  setOverlayDebug,
  setOverlayTrackingStatus,
  showOverlayMessage,
} from "../ui/overlay.js";
import { clearElement, getAppRoot } from "../utils/dom.js";
import { updateModelFromAnchor } from "./anchors.js";
import { updateHitTest } from "./hitTest.js";
import { handleSelect } from "./input.js";

export async function startARExperience(state, { onExit, onFallback } = {}) {
  state.setMode("starting-ar");
  clearElement(getAppRoot());
  document.body.classList.add("xr-active");

  const scene = createScene();
  const camera = new THREE.PerspectiveCamera();
  const renderer = createRenderer();
  document.body.appendChild(renderer.domElement);

  let model = null;
  let session = null;
  let pendingFallback = false;
  let hitTestSource = null;
  let referenceSpace = null;

  const overlay = ensureOverlay({
    state,
    onRealign: () => {
      if (model) model.visible = false;
      deleteAnchor(state.anchor);
      state.resetPlacement();
      setOverlayMode("scanning");
    },
    onExit: () => {
      if (state.xrSession) {
        state.xrSession.end();
      } else if (onExit) {
        onExit();
      }
    },
    onFallback: () => {
      pendingFallback = true;
      if (state.xrSession) {
        state.xrSession.end();
      } else if (onFallback) {
        onFallback();
      }
    },
  });

  setOverlayMode("starting");

  try {
    session = await requestARSession(renderer);
  } catch (error) {
    console.error(error);
    renderer.domElement.remove();
    removeOverlay();
    document.body.classList.remove("xr-active");
    state.setError(error);
    if (onExit) onExit();
    return;
  }

  state.xrSession = session;
  setOverlayMode("loading");

  const alignmentGuide = createAlignmentGuide();
  scene.add(alignmentGuide);
  const testCube = createARTestCube();
  scene.add(testCube);

  try {
    model = state.loadedModel || (await loadModel());
    state.loadedModel = model;
    applyModelConfig(model);
    model.visible = false;
    scene.add(model);
  } catch (error) {
    console.error(error);
    if (state.xrSession) {
      await state.xrSession.end();
    }
    renderer.domElement.remove();
    removeOverlay();
    document.body.classList.remove("xr-active");
    state.setError(error);
    return;
  }

  try {
    referenceSpace = renderer.xr.getReferenceSpace();
    hitTestSource = await requestHitTestSource(renderer);
  } catch (error) {
    console.error("Hit-test setup failed", error);
    showOverlayMessage(
      "Surface detection is unavailable. Please use another device or open the 3D viewer."
    );
    renderer.setAnimationLoop(null);
    renderer.dispose();
    renderer.domElement.remove();
    await session.end();
    state.xrSession = null;
    document.body.classList.remove("xr-active");
    state.setMode("unsupported");
    return;
  }

  state.setMode("scanning-surface");
  setOverlayMode("scanning");

  session.addEventListener("select", async () => {
    try {
      await handleSelect({ state, model, alignmentGuide });
      if (state.mode === "model-placed") {
        setOverlayMode("placed");
      }
    } catch (error) {
      console.error("Placement failed", error);
      showOverlayMessage("Placement failed. Please re-align and try again.");
    }
  });

  session.addEventListener("end", () => {
    if (hitTestSource) hitTestSource.cancel();
    deleteAnchor(state.anchor);
    renderer.setAnimationLoop(null);
    renderer.dispose();
    renderer.domElement.remove();
    removeOverlay();
    document.body.classList.remove("xr-active");
    state.xrSession = null;
    state.anchor = null;
    state.lastHitMatrix = null;
    state.lastHitResult = null;
    state.modelPlaced = false;
    state.setMode("ready");
    if (pendingFallback && onFallback) {
      onFallback();
    } else if (onExit) {
      onExit();
    }
  });

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", resize);

  renderer.setAnimationLoop((time, frame) => {
    if (!frame) return;

    updateHitTest({
      frame,
      referenceSpace,
      hitTestSource,
      alignmentGuide,
      state,
      onTrackingStatus: (hasHit) => {
        setOverlayTrackingStatus(hasHit);
        updateTestCube(testCube, state.lastHitMatrix);
      },
    });

    if (state.modelPlaced && state.anchor && model) {
      updateModelFromAnchor({
        frame,
        referenceSpace,
        anchor: state.anchor,
        model,
      });
    }

    setOverlayDebug(state);
    renderer.render(scene, camera);
  });

  const cleanup = () => window.removeEventListener("resize", resize);
  session.addEventListener("end", cleanup, { once: true });
  state.activeExperience = {
    dispose: () => {
      cleanup();
      if (state.xrSession) state.xrSession.end();
    },
  };

  return overlay;
}

function deleteAnchor(anchor) {
  if (anchor && typeof anchor.delete === "function") {
    anchor.delete();
  }
}

function createARTestCube() {
  const geometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  const material = new THREE.MeshBasicMaterial({ color: 0xfff200 });
  const cube = new THREE.Mesh(geometry, material);
  cube.visible = false;
  cube.matrixAutoUpdate = false;
  return cube;
}

function updateTestCube(cube, hitMatrix) {
  if (!APP_CONFIG.ui.showARTestCube || !hitMatrix) {
    cube.visible = false;
    return;
  }

  cube.matrix.copy(hitMatrix);
  cube.matrix.decompose(cube.position, cube.quaternion, cube.scale);
  cube.position.y += 0.12;
  cube.updateMatrix();
  cube.visible = true;
}

async function requestARSession(renderer) {
  const sessionInit = {
    requiredFeatures: APP_CONFIG.features.requireHitTest ? ["hit-test"] : [],
    optionalFeatures: [],
  };

  if (APP_CONFIG.features.requestAnchors) {
    sessionInit.optionalFeatures.push("anchors");
  }

  if (APP_CONFIG.features.requestDomOverlay) {
    sessionInit.optionalFeatures.push("dom-overlay");
    sessionInit.domOverlay = { root: document.body };
  }

  renderer.xr.setReferenceSpaceType("local");

  try {
    const session = await navigator.xr.requestSession("immersive-ar", sessionInit);
    await renderer.xr.setSession(session);
    return session;
  } catch (firstError) {
    console.warn(
      "Preferred WebXR session failed. Retrying without optional features.",
      firstError
    );

    const minimalSession = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: APP_CONFIG.features.requireHitTest ? ["hit-test"] : [],
    });
    await renderer.xr.setSession(minimalSession);
    return minimalSession;
  }
}

async function requestHitTestSource(renderer) {
  const session = renderer.xr.getSession();
  const viewerSpace = await session.requestReferenceSpace("viewer");
  const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

  session.addEventListener("end", () => {
    hitTestSource.cancel();
  });

  return hitTestSource;
}
