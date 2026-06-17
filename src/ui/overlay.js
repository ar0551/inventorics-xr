import { createElement } from "../utils/dom.js";

let overlayRoot = null;
let messageElement = null;
let realignButton = null;
let exitButton = null;
let fallbackButton = null;

export function ensureOverlay({ onRealign, onExit, onFallback }) {
  removeOverlay();

  overlayRoot = createElement("div", { className: "xr-overlay" });
  messageElement = createElement("p", { className: "xr-overlay-message" });
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

  actions.append(realignButton, exitButton, fallbackButton);
  overlayRoot.append(messageElement, actions);
  document.body.append(overlayRoot);
  setOverlayMode("scanning");

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
  realignButton = null;
  exitButton = null;
  fallbackButton = null;
}
