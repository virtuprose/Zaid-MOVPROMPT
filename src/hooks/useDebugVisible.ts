// Gate developer-only UI: visible only when `?debug=1` is in the URL.
// Even admins must opt in explicitly to keep the Director surface clean.
export function useDebugVisible(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
}
