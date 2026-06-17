import { APP_CONFIG } from "../app/config.js";
import { createElement } from "../utils/dom.js";
import { degreesToRadians, radiansToDegrees } from "../utils/math.js";

export function createDebugPanel() {
  const panel = createElement("aside", { className: "debug-panel" });
  const heading = createElement("h2", { text: "Calibration" });
  const fields = createElement("div", { className: "debug-fields" });
  const output = createElement("textarea", { className: "debug-output" });
  output.readOnly = true;

  const controls = [
    numberControl("Model scale", APP_CONFIG.model.scale, (value) => {
      APP_CONFIG.model.scale = value;
      updateOutput();
    }),
    numberControl("Offset X", APP_CONFIG.placement.offset.x, (value) => {
      APP_CONFIG.placement.offset.x = value;
      updateOutput();
    }),
    numberControl("Offset Y", APP_CONFIG.placement.offset.y, (value) => {
      APP_CONFIG.placement.offset.y = value;
      updateOutput();
    }),
    numberControl("Offset Z", APP_CONFIG.placement.offset.z, (value) => {
      APP_CONFIG.placement.offset.z = value;
      updateOutput();
    }),
    numberControl(
      "Rotation Y degrees",
      radiansToDegrees(APP_CONFIG.placement.rotationY),
      (value) => {
        APP_CONFIG.placement.rotationY = degreesToRadians(value);
        updateOutput();
      }
    ),
    selectControl(
      "Guide type",
      APP_CONFIG.alignmentGuide.type,
      ["axes", "rectangle"],
      (value) => {
        APP_CONFIG.alignmentGuide.type = value;
        updateOutput();
      }
    ),
  ];

  const copyButton = createElement("button", {
    className: "button button-secondary",
    text: "Copy Config JSON",
    type: "button",
  });
  copyButton.addEventListener("click", async () => {
    updateOutput();
    await navigator.clipboard.writeText(output.value);
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy Config JSON";
    }, 1200);
  });

  function updateOutput() {
    output.value = JSON.stringify(
      {
        model: APP_CONFIG.model,
        placement: APP_CONFIG.placement,
        alignmentGuide: APP_CONFIG.alignmentGuide,
      },
      null,
      2
    );
  }

  controls.forEach((control) => fields.append(control));
  panel.append(heading, fields, copyButton, output);
  updateOutput();
  return panel;
}

function numberControl(labelText, value, onChange) {
  const label = createElement("label", { className: "debug-field" });
  const span = createElement("span", { text: labelText });
  const input = createElement("input");
  input.type = "number";
  input.step = "0.01";
  input.value = String(value);
  input.addEventListener("input", () => onChange(Number(input.value)));
  label.append(span, input);
  return label;
}

function selectControl(labelText, value, options, onChange) {
  const label = createElement("label", { className: "debug-field" });
  const span = createElement("span", { text: labelText });
  const select = createElement("select");

  options.forEach((option) => {
    const element = createElement("option", { text: option });
    element.value = option;
    element.selected = option === value;
    select.append(element);
  });

  select.addEventListener("change", () => onChange(select.value));
  label.append(span, select);
  return label;
}
