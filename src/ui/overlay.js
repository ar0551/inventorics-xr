import { createElement } from "../utils/dom.js";
import { isDebugEnabled } from "../app/config.js";

let overlayRoot = null;
let messageElement = null;
let debugElement = null;
let realignButton = null;
let exitButton = null;
let fallbackButton = null;
let lastTrackingStatus = null;

export function ensureOverlay({ onRealign, onExit, onFallback }) {
  removeOverlay();

  overlayRoot = createElement("div", { className: "xr-overlay" });
  messageElement = createElement("p", { className: "xr-overlay-message" });
  debugElement = createElement("pre", { className: "xr-overlay-debug" });
  const actions = createElement("div", { className: "xr-overlay-actions" });

  realignButton = createElement("button", {
    className: "button button-secondary",
    text: "Re-align",
    type: "button",
  });
  exitButton = createElement("button", {
    className: "button button-secondary",
    text: "Exit AR",
    type: "button",
  });
  fallbackButton = createElement("button", {
    className: "button button-secondary",
    text: "Open 3D Viewer",
    type: "button",
  });

  realignButton.addEventListener("click", onRealign);
  exitButton.addEventListener("click", onExit);
  if (onFallback) fallbackButton.addEventListener("click", onFallback);

  debugElement.hidden = !isDebugEnabled();

  actions.append(realignButton, exitButton, fallbackButton);
  overlayRoot.append(messageElement, debugElement, actions);
  document.body.append(overlayRoot);
  setOverlayMode("loading");

  return overlayRoot;
}

export function setOverlayMode(mode) {
  if (!overlayRoot || !messageElement) return;
  overlayRoot.dataset.mode = mode;

  if (mode === "placed") {
    messageElement.textContent = "Model locked. Move around to inspect.";
    realignButton.hidden = false;
    exitButton.hidden = false;
    fallbackButton.hidden = true;
    return;
  }

  if (mode === "starting") {
    messageElement.textContent = "Starting AR session. Allow camera access if prompted.";
    realignButton.hidden = true;
    exitButton.hidden = false;
    fallbackButton.hidden = true;
    return;
  }

  if (mode === "loading") {
    messageElement.textContent = "Loading exhibition model...";
    realignButton.hidden = true;
    exitButton.hidden = false;
    fallbackButton.hidden = true;
    return;
  }

  if (mode === "error") {
    realignButton.hidden = true;
    exitButton.hidden = false;
    fallbackButton.hidden = false;
    return;
  }

  messageElement.textContent =
    "Point at the exhibition alignment marker. When the axes appear, tap once to lock the model.";
  realignButton.hidden = true;
  exitButton.hidden = false;
  fallbackButton.hidden = true;
}

export function setOverlayTrackingStatus(hasHit) {
  if (!overlayRoot || !messageElement) return;
  if (overlayRoot.dataset.mode !== "scanning") return;
  if (lastTrackingStatus === hasHit) return;

  lastTrackingStatus = hasHit;
  messageElement.textContent = hasHit
    ? "Alignment axes found. Tap once to lock the model."
    : "Point at the exhibition alignment marker. Move slowly until the axes appear.";
}

export function setOverlayDebug(state) {
  if (!debugElement || debugElement.hidden) return;

  const hitRate =
    state.hitTestFrames > 0
      ? Math.round((state.hitTestHits / state.hitTestFrames) * 100)
      : 0;

  debugElement.textContent = [
    `mode: ${state.mode}`,
    `hit frames: ${state.hitTestHits}/${state.hitTestFrames} (${hitRate}%)`,
    `anchor: ${state.anchor ? "yes" : "no"}`,
    `placed: ${state.modelPlaced ? "yes" : "no"}`,
  ].join("\n");
}

export function showOverlayMessage(message) {
  if (!messageElement) return;
  messageElement.textContent = message;
  setOverlayMode("error");
}

export function removeOverlay() {
  if (overlayRoot) {
    overlayRoot.remove();
  }

  overlayRoot = null;
  messageElement = null;
  debugElement = null;
  realignButton = null;
  exitButton = null;
  fallbackButton = null;
  lastTrackingStatus = null;
}
