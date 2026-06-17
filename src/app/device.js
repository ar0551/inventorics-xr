export function detectDevice() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isAndroid = /Android/.test(ua);
  const isChrome =
    /Chrome|CriOS/.test(ua) && !/Edg|OPR|SamsungBrowser/.test(ua);
  const isSafari =
    /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg|OPR/.test(ua);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi/.test(ua);

  let instruction =
    "Use an AR-capable Android device with Chrome for the most reliable experience.";
  let severity = "warning";

  if (isAndroid && isChrome) {
    instruction =
      "Recommended setup detected: Android + Chrome. Load the model, then tap Enter AR.";
    severity = "ok";
  } else if (isAndroid && !isChrome) {
    instruction = "For AR, open this page in Google Chrome on Android.";
    severity = "warning";
  } else if (isIOS) {
    instruction =
      "iOS Safari may not support WebXR AR. Use a WebXR Viewer/Player app if available, or use one of the exhibition Android devices. You can still inspect the model in the 3D viewer.";
    severity = "unsupported";
  } else if (!isMobile) {
    instruction =
      "Desktop AR is not available for this exhibition setup. Scan the QR code with Android Chrome, or open the 3D viewer.";
    severity = "warning";
  }

  return {
    isIOS,
    isAndroid,
    isChrome,
    isSafari,
    isFirefox,
    isMobile,
    userAgent: ua,
    instruction,
    severity,
  };
}
