import "./styles.css";
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

  const showLanding = () => {
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
      onStartAR: () =>
        startARExperience(state, {
          onExit: showLanding,
          onFallback: openViewer,
        }),
      onOpenViewer: openViewer,
    });
  };

  const openViewer = () => {
    if (state.activeExperience?.dispose) {
      state.activeExperience.dispose();
    }

    state.setMode("fallback-viewer");
    startFallbackViewer(state, { onBack: showLanding });
  };

  showLanding();
}

main().catch((error) => {
  console.error(error);
});
