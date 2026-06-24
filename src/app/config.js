export const APP_CONFIG = {
  app: {
    name: "inventorics-xr",
    title: "Inventorics XR",
    subtitle: "Web-based AR viewer for site-calibrated exhibition models",
  },

  project: {
    title: "Inventorics",
    subtitle: "Recombining Artifacts for Innovation",
    code: "FWF PEEK AR 730-G",
    websiteUrl: "https://inventorics.com/",
    universityUrl: "http://www.dieangewandte.at/",
    funderUrl: "https://www.fwf.ac.at/",
  },

  model: {
    url: "/models/optimized/FrameStructure_v6_10_1024.glb",
    dracoDecoderPath: "/draco/gltf/",
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },

  placement: {
    offset: { x: 0, y: 0, z: -1.2 },
    rotationY: 0,
    lockAfterPlacement: true,
    useAnchorsIfAvailable: false,
  },

  alignmentGuide: {
    type: "axes",
    axes: {
      length: 0.7,
      thickness: 0.012,
    },
    rectangle: {
      width: 0.6,
      depth: 0.4,
      thickness: 0.015,
    },
  },

  features: {
    requireHitTest: true,
    requestAnchors: false,
    requestDomOverlay: true,
  },

  ui: {
    showDebugPanel: false,
    showARTestCube: false,
    allowFallbackViewer: true,
    allowReset: true,
    allowDetailMode: false,
  },
};

export function isDebugEnabled() {
  return new URLSearchParams(window.location.search).get("debug") === "true";
}
