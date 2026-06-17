import { isDebugEnabled } from "../app/config.js";
import { clearElement, createElement, getAppRoot } from "../utils/dom.js";
import { createDebugPanel } from "./debugPanel.js";

export function createUnsupportedUI({
  state,
  device,
  support,
  onOpenViewer,
  onBack,
}) {
  const root = getAppRoot();
  clearElement(root);

  const page = createElement("main", { className: "page-shell" });
  const panel = createElement("section", { className: "landing-panel" });
  const title = createElement("h1", {
    text: "AR is not available on this device/browser.",
  });
  const reason = createElement("p", {
    className: `device-note ${device.severity}`,
    text: support.reason || device.instruction,
  });
  const recommended = createElement("div", {
    className: "instructions",
    html: `
      <h2>Recommended</h2>
      <ul>
        <li>Android phone or tablet</li>
        <li>Google Chrome</li>
        <li>Camera permissions enabled</li>
      </ul>
      <h2>On iOS</h2>
      <ul>
        <li>Safari may not support WebXR AR.</li>
        <li>Use a WebXR Viewer/Player app if available.</li>
        <li>For the exhibition, use one of the provided Android devices.</li>
      </ul>
      <p>You can still inspect the model in the 3D viewer.</p>
    `,
  });
  const actions = createElement("div", { className: "actions" });
  const viewerButton = createElement("button", {
    className: "button button-primary",
    text: "Open 3D Viewer",
    type: "button",
  });
  viewerButton.addEventListener("click", onOpenViewer);
  actions.append(viewerButton);

  if (onBack) {
    const backButton = createElement("button", {
      className: "button button-secondary",
      text: "Back",
      type: "button",
    });
    backButton.addEventListener("click", onBack);
    actions.append(backButton);
  }

  panel.append(title, reason, recommended, actions);
  page.append(panel);

  if (isDebugEnabled()) {
    page.append(createDebugPanel({ state }));
  }

  root.append(page);
}
