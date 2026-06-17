import { APP_CONFIG, isDebugEnabled } from "../app/config.js";
import { clearElement, createElement, getAppRoot } from "../utils/dom.js";
import { createDebugPanel } from "./debugPanel.js";

export function createLandingUI({
  state,
  device,
  support,
  onStartAR,
  onOpenViewer,
}) {
  const root = getAppRoot();
  clearElement(root);

  const page = createElement("main", { className: "page-shell" });
  const panel = createElement("section", { className: "landing-panel" });
  const eyebrow = createElement("p", {
    className: "eyebrow",
    text: "Site-calibrated AR exhibit viewer",
  });
  const title = createElement("h1", { text: APP_CONFIG.app.title });
  const subtitle = createElement("p", {
    className: "lede",
    text: "This browser-based AR viewer places a digital model in a calibrated exhibition location.",
  });
  const instruction = createElement("p", {
    className: `device-note ${device.severity}`,
    text: device.instruction,
  });
  const supportNote = createElement("p", {
    className: "support-note",
    text: support.immersiveAR
      ? "WebXR AR appears available on this device/browser."
      : support.reason || "AR support could not be confirmed.",
  });
  const instructions = createInstructions();
  const actions = createElement("div", { className: "actions" });

  if (support.immersiveAR) {
    const startButton = createElement("button", {
      className: "button button-primary",
      text: "Start AR",
      type: "button",
    });
    startButton.addEventListener("click", onStartAR);
    actions.append(startButton);
  }

  const viewerButton = createElement("button", {
    className: "button button-secondary",
    text: "Open 3D Viewer",
    type: "button",
  });
  viewerButton.addEventListener("click", onOpenViewer);
  actions.append(viewerButton);

  panel.append(eyebrow, title, subtitle, instruction, supportNote, instructions, actions);
  page.append(panel);

  if (isDebugEnabled()) {
    page.append(createDebugPanel({ state }));
  }

  root.append(page);
}

function createInstructions() {
  const section = createElement("section", { className: "instructions" });
  const heading = createElement("h2", { text: "How to use" });
  const list = createElement("ol");

  [
    "Stand on the marked point.",
    "Point your phone at the alignment marker.",
    "Tap Start AR.",
    "When the alignment axes appear, tap once.",
    "Walk around the model to inspect it at full scale.",
  ].forEach((item) => {
    const li = createElement("li", { text: item });
    list.append(li);
  });

  section.append(heading, list);
  return section;
}
