import { APP_CONFIG, isDebugEnabled } from "../app/config.js";
import { clearElement, createElement, getAppRoot } from "../utils/dom.js";
import { createDebugPanel } from "./debugPanel.js";

export function createLandingUI({
  state,
  device,
  support,
  onLoadModel,
}) {
  const root = getAppRoot();
  clearElement(root);

  const page = createElement("main", { className: "page-shell" });
  const panel = createElement("section", { className: "landing-panel landing-hero" });
  const eyebrow = createElement("p", {
    className: "eyebrow",
    text: APP_CONFIG.project.code,
  });
  const title = createElement("h1", { text: APP_CONFIG.project.title });
  const projectSubtitle = createElement("p", {
    className: "project-subtitle",
    text: APP_CONFIG.project.subtitle,
  });
  const subtitle = createElement("p", {
    className: "lede",
    text: "A site-calibrated AR viewer for inspecting a digital exhibition model in place.",
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
  const actions = createElement("div", { className: "actions landing-actions" });

  const loadButton = createElement("button", {
    className: "button button-primary",
    text: "Load Model",
    type: "button",
  });
  loadButton.addEventListener("click", onLoadModel);
  actions.append(loadButton);

  panel.append(eyebrow, title, projectSubtitle, subtitle, actions, instruction, supportNote);
  page.append(panel, createProjectInfo(instructions));

  if (isDebugEnabled()) {
    page.append(createDebugPanel({ state }));
  }

  root.append(page);
}

export function createProjectInfo(instructions = null) {
  const aside = createElement("aside", { className: "landing-info" });
  const about = createElement("section", { className: "about-project" });
  const heading = createElement("h2", { text: "About the project" });
  const description = createElement("p", {
    text: `"${APP_CONFIG.project.title} - ${APP_CONFIG.project.subtitle}" ${APP_CONFIG.project.code} is an artistic research project at the `,
  });
  description.append(
    createExternalLink("University of Applied Arts Vienna", APP_CONFIG.project.universityUrl),
    document.createTextNode(" funded by the "),
    createExternalLink("Austrian Science Fund (FWF)", APP_CONFIG.project.funderUrl),
    document.createTextNode(" within the PEEK programme.")
  );

  const team = createElement("p", {
    text: "The team consists of architects, designers, programmers and engineers.",
  });

  const links = createProjectLinks();
  about.append(heading, description, team);
  if (links) about.append(links);

  aside.append(about);
  if (instructions) aside.append(instructions);
  return aside;
}

function createExternalLink(text, href) {
  const link = createElement("a", { text });
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  return link;
}

function createProjectLinks() {
  if (!APP_CONFIG.project.websiteUrl) return null;

  const links = createElement("p", { className: "project-links" });
  links.append(createExternalLink("Project website", APP_CONFIG.project.websiteUrl));
  return links;
}

function createInstructions() {
  const section = createElement("section", { className: "instructions" });
  const heading = createElement("h2", { text: "How to use" });
  const list = createElement("ol");

  [
    "Stand on the marked point.",
    "Point your phone at the alignment marker.",
    "Load the model.",
    "Tap Enter AR.",
    "When the alignment axes appear, tap once.",
    "Walk around the model to inspect it at full scale.",
  ].forEach((item) => {
    const li = createElement("li", { text: item });
    list.append(li);
  });

  section.append(heading, list);
  return section;
}
