import { isDebugEnabled } from "../app/config.js";

export function debugLog(...args) {
  if (isDebugEnabled()) {
    console.log(...args);
  }
}
