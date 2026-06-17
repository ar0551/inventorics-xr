export function updateHitTest({
  frame,
  referenceSpace,
  hitTestSource,
  alignmentGuide,
  state,
}) {
  if (state.mode !== "scanning-surface") return;
  if (!hitTestSource) return;

  const results = frame.getHitTestResults(hitTestSource);

  if (results.length > 0) {
    const hit = results[0];
    const pose = hit.getPose(referenceSpace);

    if (pose) {
      alignmentGuide.visible = true;
      alignmentGuide.matrix.fromArray(pose.transform.matrix);
      state.lastHitMatrix = alignmentGuide.matrix.clone();
      state.lastHitResult = hit;
    }
  } else {
    alignmentGuide.visible = false;
    state.lastHitMatrix = null;
    state.lastHitResult = null;
  }
}
