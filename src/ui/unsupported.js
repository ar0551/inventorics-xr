import { APP_CONFIG, isDebugEnabled } from "../app/config.js";
import { clearElement, createElement, getAppRoot } from "../utils/dom.js";
import { createDebugPanel } from "./debugPanel.js";
import { createProjectInfo } from "./landing.js";

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
  const panel = createElement("section", { className: "landing-panel landing-hero" });
  const logo = createElement("img", { className: "landing-logo" });
  logo.src = "/logo_v3.png";
  logo.alt = "Inventorics";
  const eyebrow = createElement("p", {
    className: "eyebrow",
    text: APP_CONFIG.project.code,
  });
  const title = createElement("h1", {
    text: APP_CONFIG.project.title,
  });
  const projectSubtitle = createElement("p", {
    className: "project-subtitle",
    text: APP_CONFIG.project.subtitle,
  });
  const unavailable = createElement("p", {
    className: "ar-unavailable",
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
  const actions = createElement("div", { className: "actions landing-actions" });
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

  panel.append(logo, eyebrow, title, projectSubtitle, unavailable, reason, actions, recommended);
  page.append(panel, createProjectInfo());

  if (isDebugEnabled()) {
    page.append(createDebugPanel({ state }));
  }

  root.append(page);
}
