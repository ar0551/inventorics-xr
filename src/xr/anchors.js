import { debugLog } from "../utils/logger.js";
import { placeModelAtMatrix } from "../scene/placement.js";

export async function tryCreateAnchor(hitResult) {
  if (!hitResult) return null;

  if (typeof hitResult.createAnchor !== "function") {
    debugLog("Anchors unavailable; using hit-test placement only.");
    return null;
  }

  try {
    return await hitResult.createAnchor();
  } catch (error) {
    debugLog("Anchors unavailable; using hit-test placement only.", error);
    return null;
  }
}

export function updateModelFromAnchor({ frame, referenceSpace, anchor, model }) {
  if (!anchor) return false;

  const pose = frame.getPose(anchor.anchorSpace, referenceSpace);
  if (!pose) return false;

  placeModelAtMatrix(model, pose.transform.matrix);
  return true;
}
