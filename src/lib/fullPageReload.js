export function triggerFullPageReload() {
  if (typeof window === "undefined") {
    return false;
  }

  window.location.reload();
  return true;
}