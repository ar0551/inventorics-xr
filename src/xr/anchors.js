import { debugLog } from "../utils/logger.js";

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

export function updateFromAnchor({ frame, referenceSpace, anchor }) {
  if (!anchor) return false;

  const pose = frame.getPose(anchor.anchorSpace, referenceSpace);
  return Boolean(pose);
}
