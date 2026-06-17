import * as THREE from "three";
import { APP_CONFIG } from "../app/config.js";
import { createAlignmentGuide } from "../scene/alignmentGuide.js";
import { loadModel } from "../scene/model.js";
import { createRenderer } from "../scene/renderer.js";
import { createScene } from "../scene/scene.js";
import {
  ensureOverlay,
  removeOverlay,
  setOverlayMode,
  showOverlayMessage,
} from "../ui/overlay.js";
import { updateHitTest } from "./hitTest.js";
import { handleSelect } from "./input.js";

export async function startARExperience(state, { onExit, onFallback } = {}) {
  state.setMode("starting-ar");

  const scene = createScene();
  const camera = new THREE.PerspectiveCamera();
  const renderer = createRenderer();
  document.body.appendChild(renderer.domElement);

  const overlay = ensureOverlay({
    state,
    onRealign: () => {
      if (model) model.visible = false;
      state.resetPlacement();
      setOverlayMode("scanning");
    },
    onExit: () => {
      if (state.xrSession) state.xrSession.end();
    },
    onFallback,
  });

  let model = null;
  let session = null;
  let hitTestSource = null;
  let referenceSpace = null;

  try {
    model = await loadModel();
    scene.add(model);
  } catch (error) {
    console.error(error);
    renderer.domElement.remove();
    removeOverlay();
    state.setError(error);
    return;
  }

  const alignmentGuide = createAlignmentGuide();
  scene.add(alignmentGuide);

  try {
    session = await requestARSession();
  } catch (error) {
    renderer.domElement.remove();
    removeOverlay();
    state.setError(error);
    return;
  }

  state.xrSession = session;
  renderer.xr.setSession(session);

  try {
    referenceSpace = await session.requestReferenceSpace("local");
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  } catch (error) {
    console.error("Hit-test setup failed", error);
    showOverlayMessage(
      "Surface detection is unavailable. Please use another device or open the 3D viewer."
    );
    renderer.setAnimationLoop(null);
    renderer.dispose();
    renderer.domElement.remove();
    await session.end();
    state.setMode("unsupported");
    return;
  }

  state.setMode("scanning-surface");
  setOverlayMode("scanning");

  session.addEventListener("select", async () => {
    await handleSelect({ state, model, alignmentGuide });
    if (state.mode === "model-placed") {
      setOverlayMode("placed");
    }
  });

  session.addEventListener("end", () => {
    if (hitTestSource) hitTestSource.cancel();
    renderer.setAnimationLoop(null);
    renderer.dispose();
    renderer.domElement.remove();
    removeOverlay();
    state.xrSession = null;
    state.anchor = null;
    state.lastHitMatrix = null;
    state.lastHitResult = null;
    state.modelPlaced = false;
    state.setMode("ready");
    if (onExit) onExit();
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
    });

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

async function requestARSession() {
  const preferredInit = {
    requiredFeatures: APP_CONFIG.features.requireHitTest ? ["hit-test"] : [],
    optionalFeatures: [],
  };

  if (APP_CONFIG.features.requestAnchors) {
    preferredInit.optionalFeatures.push("anchors");
  }

  if (APP_CONFIG.features.requestDomOverlay) {
    preferredInit.optionalFeatures.push("dom-overlay");
    preferredInit.domOverlay = { root: document.body };
  }

  try {
    return await navigator.xr.requestSession("immersive-ar", preferredInit);
  } catch (firstError) {
    console.warn(
      "Preferred WebXR session failed. Retrying minimal AR session.",
      firstError
    );

    return navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: APP_CONFIG.features.requireHitTest ? ["hit-test"] : [],
    });
  }
}
