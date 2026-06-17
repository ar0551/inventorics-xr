import { APP_CONFIG } from "../app/config.js";
import { placeModelAtMatrix } from "../scene/placement.js";
import { tryCreateAnchor } from "./anchors.js";

export async function handleSelect({ state, model, alignmentGuide }) {
  if (state.mode !== "scanning-surface") return;
  if (!alignmentGuide.visible) return;
  if (!state.lastHitMatrix) return;

  placeModelAtMatrix(model, state.lastHitMatrix);

  if (APP_CONFIG.placement.useAnchorsIfAvailable && state.lastHitResult) {
    state.anchor = await tryCreateAnchor(state.lastHitResult);
  }

  alignmentGuide.visible = false;
  state.modelPlaced = true;
  state.setMode("model-placed");
}
