export class AppState {
  constructor() {
    this.mode = "loading";
    this.support = null;
    this.device = null;
    this.xrSession = null;
    this.modelPlaced = false;
    this.anchor = null;
    this.lastHitMatrix = null;
    this.lastHitResult = null;
    this.error = null;
    this.activeExperience = null;
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
    this.lastHitResult = null;
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
