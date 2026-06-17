export async function checkXRSupport() {
  if (!("xr" in navigator)) {
    return {
      immersiveAR: false,
      reason: "WebXR is not available in this browser.",
    };
  }

  try {
    const immersiveAR = await navigator.xr.isSessionSupported("immersive-ar");

    return {
      immersiveAR,
      reason: immersiveAR
        ? null
        : "Immersive AR is not supported on this device/browser.",
    };
  } catch (error) {
    return {
      immersiveAR: false,
      reason: "Could not check WebXR support.",
      error,
    };
  }
}
