# Codex Implementation Instructions — `inventorics-xr`

Build a small JavaScript WebXR exhibition app named `inventorics-xr`.

The app displays a single `.glb` 3D model in AR at a repeatable exhibition location. The position is not persistent across sessions; instead, the visitor aligns the model to a physical exhibition reference point using a guided alignment graphic shown in AR. The app must be robust for public exhibition use and must provide clear device/browser instructions and graceful fallbacks.

---

## 1. Core experience

Visitor flow:

1. Visitor scans a QR code.
2. Landing page opens.
3. App checks device/browser support.
4. Visitor sees device-specific instructions.
5. Visitor taps **Start AR**.
6. App starts a WebXR `immersive-ar` session if supported.
7. App shows an alignment guide, not a circular reticle.
8. Visitor points at the physical floor/plinth marker and taps once.
9. App places the model using the detected surface pose plus a configured offset/rotation.
10. Model becomes locked in place.
11. Visitor can walk around the model.
12. Visitor can tap **Re-align** if placement is wrong.
13. If AR is unsupported, visitor can open a fallback 3D viewer.

Important framing:

- This is a **site-calibrated AR exhibit viewer**, not a generic AR placer.
- The “fixed location” comes from a physical reference marker plus a configured transform.
- WebXR anchors are optional. The app must still work without anchors.

---

## 2. Tech stack

Use JavaScript, not TypeScript.

Use:

- Vite
- Three.js
- JavaScript ES modules
- GLTFLoader
- OrbitControls for fallback viewer
- WebXR immersive AR
- WebXR hit-test
- Optional anchors, if available
- Optional DOM overlay, if available

Do not use React for the first version unless explicitly requested later. Keep the app small and direct.

---

## 3. Project setup

Create the project as:

```bash
npm create vite@latest inventorics-xr -- --template vanilla
cd inventorics-xr
npm install three
```

Suggested scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0"
  }
}
```

The app must run over HTTPS for WebXR on real devices. For deployment, assume Vercel, Netlify, or Cloudflare Pages. Local testing may require a trusted local HTTPS setup or remote deployment.

---

## 4. Required folder structure

Use this structure:

```txt
inventorics-xr/
  public/
    models/
      model.glb
    markers/
      alignment-marker.svg
    poster/
      qr-placeholder.png

  src/
    main.js

    app/
      config.js
      state.js
      device.js

    xr/
      support.js
      session.js
      hitTest.js
      anchors.js
      input.js

    scene/
      scene.js
      renderer.js
      lights.js
      camera.js
      model.js
      alignmentGuide.js
      placement.js
      fallbackViewer.js

    ui/
      landing.js
      overlay.js
      unsupported.js
      debugPanel.js

    utils/
      dom.js
      math.js
      logger.js

  index.html
  package.json
  vite.config.js
```

If a simpler first pass is needed, keep the same logical separation but fewer files. Do not put all logic in `main.js`.

---

## 5. Global configuration

Create `src/app/config.js`.

```js
export const APP_CONFIG = {
  app: {
    name: "inventorics-xr",
    title: "Inventorics XR",
    subtitle: "Web-based AR viewer for site-calibrated exhibition models",
  },

  model: {
    url: "/models/model.glb",
    scale: 1.0,

    // Correction applied to the imported GLB itself.
    // Use this to fix model origin/orientation without changing placement logic.
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },

  placement: {
    // Offset from the tapped physical reference location.
    // Units are meters.
    offset: { x: 0, y: 0, z: -1.2 },

    // Extra rotation applied after aligning to detected surface pose.
    rotationY: 0,

    lockAfterPlacement: true,
    useAnchorsIfAvailable: true,
  },

  alignmentGuide: {
    // "axes" or "rectangle"
    type: "axes",

    axes: {
      length: 0.45,
      thickness: 0.015,
    },

    rectangle: {
      width: 0.6,
      depth: 0.4,
      thickness: 0.015,
    },
  },

  features: {
    requireHitTest: true,
    requestAnchors: true,
    requestDomOverlay: true,
  },

  ui: {
    showDebugPanel: false,
    allowFallbackViewer: true,
    allowReset: true,
    allowDetailMode: false,
  },
};
```

Everything exhibition-specific should be tunable here:

- model URL
- scale
- model orientation correction
- placement offset
- placement rotation
- alignment guide type
- fallback behavior

---

## 6. App state

Create `src/app/state.js`.

```js
export class AppState {
  constructor() {
    this.mode = "loading";
    this.support = null;
    this.device = null;
    this.xrSession = null;
    this.modelPlaced = false;
    this.anchor = null;
    this.lastHitMatrix = null;
    this.error = null;
    this.listeners = new Set();
  }

  setMode(mode) {
    this.mode = mode;
    this.emit();
  }

  setSupport(support) {
    this.support = support;
    this.emit();
  }

  setDevice(device) {
    this.device = device;
    this.emit();
  }

  setError(error) {
    this.error = error;
    this.mode = "error";
    this.emit();
  }

  resetPlacement() {
    this.modelPlaced = false;
    this.anchor = null;
    this.lastHitMatrix = null;
    this.setMode("scanning-surface");
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this);
  }
}
```

Use these app modes:

```js
"loading"
"unsupported"
"ready"
"starting-ar"
"scanning-surface"
"model-placed"
"fallback-viewer"
"error"
```

---

## 7. Device and browser detection

Create `src/app/device.js`.

The goal is not perfect detection. The goal is useful visitor instructions.

Return:

```js
{
  isIOS: boolean,
  isAndroid: boolean,
  isChrome: boolean,
  isSafari: boolean,
  isFirefox: boolean,
  isMobile: boolean,
  userAgent: string,
  instruction: string,
  severity: "ok" | "warning" | "unsupported"
}
```

Detection logic:

```js
export function detectDevice() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome|CriOS/.test(ua) && !/Edg|OPR|SamsungBrowser/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg|OPR/.test(ua);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi/.test(ua);

  let instruction = "Use an AR-capable Android device with Chrome for the most reliable experience.";
  let severity = "warning";

  if (isAndroid && isChrome) {
    instruction = "Recommended setup detected: Android + Chrome. Tap Start AR to continue.";
    severity = "ok";
  } else if (isAndroid && !isChrome) {
    instruction = "For AR, open this page in Google Chrome on Android.";
    severity = "warning";
  } else if (isIOS) {
    instruction = "iOS Safari does not reliably support WebXR AR. Use a dedicated WebXR Viewer/Player app if available, or use one of the exhibition Android devices. You can still open the fallback 3D viewer.";
    severity = "unsupported";
  } else if (!isMobile) {
    instruction = "Desktop browsers cannot show phone-based AR. Use the fallback 3D viewer or scan the QR code on an AR-capable Android phone using Chrome.";
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
```

Important wording for iOS:

- Do not promise that iOS Safari works.
- Do not promise that a WebXR Viewer/Player will be available to every visitor.
- Present iOS as a fallback/testing option only.
- For public exhibition reliability, recommend provided Android Chrome devices.

---

## 8. WebXR support detection

Create `src/xr/support.js`.

The app must check:

- `navigator.xr`
- `navigator.xr.isSessionSupported("immersive-ar")`
- whether hit-test can be requested
- whether anchors are available only after session creation
- whether DOM overlay is optional

Example:

```js
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
      reason: immersiveAR ? null : "Immersive AR is not supported on this device/browser.",
    };
  } catch (error) {
    return {
      immersiveAR: false,
      reason: "Could not check WebXR support.",
      error,
    };
  }
}
```

Do not block the whole app if AR is unsupported. Show unsupported UI and fallback viewer.

---

## 9. Landing UI

Create `src/ui/landing.js`.

The landing page must show:

- `Inventorics XR`
- short description
- device/browser instruction from `detectDevice()`
- `Start AR` button if WebXR AR appears available
- `Open 3D Viewer` fallback button
- concise exhibition instructions

Suggested copy:

```txt
Inventorics XR

A browser-based AR viewer for placing a 3D model in a calibrated exhibition location.

Instructions:
1. Stand on the marked viewing point.
2. Point your phone at the floor/plinth alignment marker.
3. Tap Start AR.
4. When the alignment axes appear, tap once to lock the model.
5. Walk around to inspect the structure.
```

Device-specific copy:

- Android Chrome: “Recommended setup detected.”
- Android non-Chrome: “Open this page in Google Chrome.”
- iOS: “Use a WebXR Viewer/Player app if available, or use an exhibition Android device. Safari may not support immersive AR.”
- Desktop: “Use fallback viewer or scan QR code on Android Chrome.”

---

## 10. Unsupported UI

Create `src/ui/unsupported.js`.

Show:

```txt
AR is not available on this device/browser.

Recommended:
- Android phone or tablet
- Google Chrome
- Camera permissions enabled

On iOS:
- Safari may not support WebXR AR.
- Use a WebXR Viewer/Player app if available.
- For the exhibition, use one of the provided Android devices.

You can still inspect the model in the 3D viewer.
```

Add button:

```txt
Open 3D Viewer
```

---

## 11. Scene setup

Create:

- `src/scene/scene.js`
- `src/scene/renderer.js`
- `src/scene/lights.js`
- `src/scene/camera.js`

Renderer:

```js
import * as THREE from "three";

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  return renderer;
}
```

Scene:

```js
import * as THREE from "three";
import { addLights } from "./lights.js";

export function createScene() {
  const scene = new THREE.Scene();
  addLights(scene);
  return scene;
}
```

Lights:

```js
import * as THREE from "three";

export function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(1, 3, 2);
  scene.add(dir);
}
```

---

## 12. Model loading

Create `src/scene/model.js`.

```js
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { APP_CONFIG } from "../app/config.js";

export async function loadModel() {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(APP_CONFIG.model.url);
  const model = gltf.scene;

  model.scale.setScalar(APP_CONFIG.model.scale);

  model.position.set(
    APP_CONFIG.model.position.x,
    APP_CONFIG.model.position.y,
    APP_CONFIG.model.position.z
  );

  model.rotation.set(
    APP_CONFIG.model.rotation.x,
    APP_CONFIG.model.rotation.y,
    APP_CONFIG.model.rotation.z
  );

  model.visible = false;

  model.traverse((child) => {
    if (child.isMesh) {
      child.frustumCulled = false;
    }
  });

  return model;
}
```

---

## 13. Alignment guide instead of reticle

Create `src/scene/alignmentGuide.js`.

The alignment guide should make it clear that the visitor is aligning the model to a physical reference.

Implement two possible guide types:

1. `axes`
2. `rectangle`

Default to `axes`.

### Axes guide

- A small X/Z axis marker lying on the detected surface.
- X axis horizontal.
- Z axis forward.
- Optional small central square.
- Use clear geometry, but do not rely on color alone for meaning.

Example implementation:

```js
import * as THREE from "three";
import { APP_CONFIG } from "../app/config.js";

export function createAlignmentGuide() {
  if (APP_CONFIG.alignmentGuide.type === "rectangle") {
    return createRectangleGuide();
  }

  return createAxesGuide();
}

function createAxesGuide() {
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  group.visible = false;

  const length = APP_CONFIG.alignmentGuide.axes.length;
  const thickness = APP_CONFIG.alignmentGuide.axes.thickness;

  const xGeom = new THREE.BoxGeometry(length, thickness, thickness);
  const zGeom = new THREE.BoxGeometry(thickness, thickness, length);
  const centerGeom = new THREE.BoxGeometry(thickness * 2.5, thickness * 2.5, thickness * 2.5);

  const xMat = new THREE.MeshBasicMaterial();
  const zMat = new THREE.MeshBasicMaterial();
  const centerMat = new THREE.MeshBasicMaterial();

  const xAxis = new THREE.Mesh(xGeom, xMat);
  const zAxis = new THREE.Mesh(zGeom, zMat);
  const center = new THREE.Mesh(centerGeom, centerMat);

  // Raise slightly above detected surface to avoid z-fighting.
  xAxis.position.y = 0.01;
  zAxis.position.y = 0.01;
  center.position.y = 0.015;

  group.add(xAxis, zAxis, center);
  return group;
}

function createRectangleGuide() {
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  group.visible = false;

  const width = APP_CONFIG.alignmentGuide.rectangle.width;
  const depth = APP_CONFIG.alignmentGuide.rectangle.depth;
  const thickness = APP_CONFIG.alignmentGuide.rectangle.thickness;

  const mat = new THREE.MeshBasicMaterial();

  const frontBackGeom = new THREE.BoxGeometry(width, thickness, thickness);
  const sideGeom = new THREE.BoxGeometry(thickness, thickness, depth);

  const front = new THREE.Mesh(frontBackGeom, mat);
  front.position.set(0, 0.01, -depth / 2);

  const back = new THREE.Mesh(frontBackGeom, mat);
  back.position.set(0, 0.01, depth / 2);

  const left = new THREE.Mesh(sideGeom, mat);
  left.position.set(-width / 2, 0.01, 0);

  const right = new THREE.Mesh(sideGeom, mat);
  right.position.set(width / 2, 0.01, 0);

  group.add(front, back, left, right);
  return group;
}
```

Do not call it `reticle` in the code. Use `alignmentGuide` everywhere.

---

## 14. Hit-test logic

Create `src/xr/hitTest.js`.

```js
export function updateHitTest({ frame, referenceSpace, hitTestSource, alignmentGuide, state }) {
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
```

If hit-test is unavailable or fails, show fallback instructions:

```txt
Surface detection is not available on this device. Please use another exhibition device or open the 3D viewer.
```

---

## 15. Placement logic

Create `src/scene/placement.js`.

```js
import * as THREE from "three";
import { APP_CONFIG } from "../app/config.js";

export function placeModelAtMatrix(model, referenceMatrix) {
  const base = new THREE.Object3D();
  base.matrixAutoUpdate = false;
  base.matrix.copy(referenceMatrix);
  base.matrix.decompose(base.position, base.quaternion, base.scale);

  const offset = new THREE.Vector3(
    APP_CONFIG.placement.offset.x,
    APP_CONFIG.placement.offset.y,
    APP_CONFIG.placement.offset.z
  );

  offset.applyQuaternion(base.quaternion);

  model.position.copy(base.position).add(offset);
  model.quaternion.copy(base.quaternion);
  model.rotateY(APP_CONFIG.placement.rotationY);
  model.visible = true;
}
```

This is the main exhibition alignment logic.

---

## 16. Optional anchors

Create `src/xr/anchors.js`.

Anchors are optional. Never make them required.

```js
export async function tryCreateAnchor(hitResult) {
  if (!hitResult) return null;
  if (typeof hitResult.createAnchor !== "function") return null;

  try {
    return await hitResult.createAnchor();
  } catch (error) {
    console.warn("Anchor creation failed. Continuing without anchor.", error);
    return null;
  }
}

export function updateFromAnchor({ frame, referenceSpace, anchor, model }) {
  if (!anchor) return false;

  const pose = frame.getPose(anchor.anchorSpace, referenceSpace);
  if (!pose) return false;

  // Optional: only use this if you decide to parent model to anchor pose.
  // In the MVP, it is acceptable to place once and let WebXR tracking handle the scene.
  return true;
}
```

Behavior:

- Request `anchors` as an optional feature.
- If supported and creation succeeds, store anchor in state.
- If not supported, continue with matrix-based placement.
- Display no scary error to visitors if anchors fail.
- In debug mode, log: “Anchors unavailable; using hit-test placement only.”

---

## 17. Input handling

Create `src/xr/input.js`.

```js
import { placeModelAtMatrix } from "../scene/placement.js";
import { tryCreateAnchor } from "./anchors.js";
import { APP_CONFIG } from "../app/config.js";

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
```

---

## 18. AR session creation

Create `src/xr/session.js`.

Required behavior:

- Request `hit-test` as required if configured.
- Request `anchors` as optional.
- Request `dom-overlay` as optional.
- If session creation fails because optional features are problematic, retry without optional features.
- If hit-test fails completely, show unsupported message and fallback viewer option.

Example:

```js
import * as THREE from "three";
import { APP_CONFIG } from "../app/config.js";
import { createScene } from "../scene/scene.js";
import { createRenderer } from "../scene/renderer.js";
import { loadModel } from "../scene/model.js";
import { createAlignmentGuide } from "../scene/alignmentGuide.js";
import { updateHitTest } from "./hitTest.js";
import { handleSelect } from "./input.js";
import { showOverlayMessage, setOverlayMode } from "../ui/overlay.js";

export async function startARExperience(state) {
  state.setMode("starting-ar");

  const scene = createScene();
  const camera = new THREE.PerspectiveCamera();
  const renderer = createRenderer();

  document.body.appendChild(renderer.domElement);

  const model = await loadModel();
  scene.add(model);

  const alignmentGuide = createAlignmentGuide();
  scene.add(alignmentGuide);

  let session;

  const preferredInit = {
    requiredFeatures: APP_CONFIG.features.requireHitTest ? ["hit-test"] : [],
    optionalFeatures: [],
  };

  if (APP_CONFIG.features.requestAnchors) {
    preferredInit.optionalFeatures.push("anchors");
  }

  if (APP_CONFIG.features.requestDomOverlay) {
    preferredInit.optionalFeatures.push("dom-overlay");
    preferredInit.domOverlay = { root: document.body };
  }

  try {
    session = await navigator.xr.requestSession("immersive-ar", preferredInit);
  } catch (firstError) {
    console.warn("Preferred WebXR session failed. Retrying minimal AR session.", firstError);

    try {
      session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: APP_CONFIG.features.requireHitTest ? ["hit-test"] : [],
      });
    } catch (secondError) {
      renderer.domElement.remove();
      state.setError(secondError);
      return;
    }
  }

  state.xrSession = session;
  renderer.xr.setSession(session);

  let referenceSpace;
  let viewerSpace;
  let hitTestSource = null;

  try {
    referenceSpace = await session.requestReferenceSpace("local");
    viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  } catch (error) {
    console.error("Hit-test setup failed", error);
    showOverlayMessage("Surface detection is not available. Please use another device or open the 3D viewer.");
    state.setMode("unsupported");
    return;
  }

  state.setMode("scanning-surface");
  setOverlayMode("scanning");

  session.addEventListener("select", () => {
    handleSelect({ state, model, alignmentGuide });
    if (state.mode === "model-placed") {
      setOverlayMode("placed");
    }
  });

  session.addEventListener("end", () => {
    renderer.setAnimationLoop(null);
    renderer.dispose();
    renderer.domElement.remove();
    state.xrSession = null;
    state.setMode("ready");
  });

  renderer.setAnimationLoop((time, frame) => {
    if (!frame) return;

    updateHitTest({
      frame,
      referenceSpace,
      hitTestSource,
      alignmentGuide,
      state,
    });

    renderer.render(scene, camera);
  });
}
```

---

## 19. Overlay UI

Create `src/ui/overlay.js`.

The overlay should be minimal and exhibition-friendly.

Modes:

```js
"scanning"
"placed"
"error"
```

Text:

Scanning:

```txt
Point at the exhibition alignment marker.
When the axes appear, tap once to lock the model.
```

Placed:

```txt
Model locked.
Move around to inspect.
```

Buttons after placement:

- `Re-align`
- `Exit AR`

The `Re-align` button should:

- hide the model
- clear the anchor
- set mode back to `scanning-surface`
- show the alignment guide again when hit-test succeeds

---

## 20. Fallback 3D viewer

Create `src/scene/fallbackViewer.js`.

Use Three.js with OrbitControls.

Behavior:

- Load same `.glb` model.
- Show on desktop/iOS/unsupported devices.
- Use orbit controls.
- Add simple lighting.
- Add button: `Back`.

This fallback is required.

The app must never dead-end on unsupported devices.

---

## 21. `main.js` orchestration

Create `src/main.js`.

Flow:

```js
import { AppState } from "./app/state.js";
import { detectDevice } from "./app/device.js";
import { checkXRSupport } from "./xr/support.js";
import { createLandingUI } from "./ui/landing.js";
import { createUnsupportedUI } from "./ui/unsupported.js";
import { startARExperience } from "./xr/session.js";
import { startFallbackViewer } from "./scene/fallbackViewer.js";

async function main() {
  const state = new AppState();

  const device = detectDevice();
  state.setDevice(device);

  const support = await checkXRSupport();
  state.setSupport(support);

  const openViewer = () => {
    state.setMode("fallback-viewer");
    startFallbackViewer(state);
  };

  if (!support.immersiveAR) {
    state.setMode("unsupported");
    createUnsupportedUI({
      state,
      device,
      support,
      onOpenViewer: openViewer,
    });
    return;
  }

  state.setMode("ready");

  createLandingUI({
    state,
    device,
    support,
    onStartAR: () => startARExperience(state),
    onOpenViewer: openViewer,
  });
}

main().catch((error) => {
  console.error(error);
});
```

---

## 22. Debug / calibration mode

Add optional debug mode using URL query:

```txt
?debug=true
```

When debug is enabled:

Show controls for:

- model scale
- placement offset X
- placement offset Y
- placement offset Z
- placement rotation Y
- guide type: axes / rectangle
- copy current config as JSON

Do not show debug mode to normal visitors.

This is important for tuning the exhibition setup on site.

---

## 23. Fallback behavior requirements

The app must handle all of these cases:

### Case A — Android Chrome + WebXR AR supported

Show:

```txt
Recommended setup detected: Android + Chrome.
```

Enable:

```txt
Start AR
Open 3D Viewer
```

### Case B — Android but not Chrome

Show:

```txt
For AR, open this page in Google Chrome on Android.
```

Still check WebXR. If AR is supported, allow start. Otherwise show fallback viewer.

### Case C — iOS

Show:

```txt
iOS Safari may not support WebXR AR.
Use a WebXR Viewer/Player app if available, or use one of the exhibition Android devices.
You can still inspect the model in the 3D viewer.
```

Do not hide the fallback viewer.

### Case D — Desktop

Show:

```txt
Desktop AR is not available for this exhibition setup.
Scan the QR code with Android Chrome, or open the 3D viewer.
```

### Case E — WebXR exists but immersive AR unsupported

Show unsupported UI and fallback viewer.

### Case F — Hit-test unavailable

Show:

```txt
Surface detection is unavailable. Please use another device or open the 3D viewer.
```

### Case G — Anchors unavailable

Do not show visitor-facing error.

In debug console only:

```txt
Anchors unavailable; using hit-test placement only.
```

### Case H — DOM overlay unavailable

Continue without DOM overlay. The app must still be usable through tap placement.

---

## 24. Exhibition copy

Use this wording in the UI or poster:

```txt
Inventorics XR

This browser-based AR viewer places a digital model in a calibrated exhibition location.

How to use:
1. Stand on the marked point.
2. Point your phone at the alignment marker.
3. Tap Start AR.
4. When the alignment axes appear, tap once.
5. Walk around the model to inspect it at full scale.
```

Compatibility note:

```txt
Best experienced on Android using Google Chrome.
On iOS, use a WebXR Viewer/Player app if available, or use one of the exhibition devices.
A non-AR 3D viewer is available as fallback.
```

---

## 25. Acceptance criteria

The implementation is complete when:

1. `npm install` and `npm run dev` work.
2. App opens a landing page.
3. App detects Android/iOS/desktop and shows appropriate instructions.
4. App checks WebXR AR support.
5. Unsupported devices get a fallback 3D viewer.
6. Android Chrome can start an immersive AR session.
7. Hit-test creates a visible alignment guide.
8. The guide is either axes or rectangle, not a circular reticle.
9. Tapping the guide places the model.
10. Model placement uses configured offset and rotation.
11. Model locks after placement.
12. Re-align resets placement.
13. Anchors are attempted only if available.
14. Missing anchors do not break the app.
15. Missing DOM overlay does not break the app.
16. Missing hit-test produces a useful fallback message.
17. The app can be deployed as a static site.
18. `APP_CONFIG` is the main place for exhibition tuning.

---

## 26. Implementation priorities

Build in this order:

1. Static landing page and fallback viewer.
2. Device/browser detection.
3. WebXR support check.
4. Empty AR session.
5. Hit-test alignment guide.
6. Model loading.
7. Tap-to-place model.
8. Lock/re-align behavior.
9. Optional anchors.
10. Debug calibration mode.
11. UI polish.

Do not start with persistent anchors, geolocation, image tracking, multi-user synchronization, or cloud spatial mapping.

---

## 27. Notes for future extension

Possible later additions:

- model annotations
- detail mode
- exploded view
- section planes
- multiple model variants
- QR parameters selecting different models
- image tracking if browser/device support becomes reliable
- cloud/local spatial persistence if using a native or platform-specific layer

For this MVP, keep the scope intentionally narrow and exhibition-safe.
