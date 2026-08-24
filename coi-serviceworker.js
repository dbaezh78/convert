/* coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT
 * Adds Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers
 * to enable SharedArrayBuffer on static sites (no server config needed).
 * https://github.com/gzuidhof/coi-serviceworker
 */
if (typeof window === "undefined") {
  // ── Service Worker scope ──────────────────────────────────────────────────
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

  async function handleFetch(request) {
    if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
      return;
    }
    let response;
    try {
      response = await fetch(request);
    } catch (_) {
      return new Response(null, { status: 503 });
    }
    if (response.status === 0) return response;

    const newHeaders = new Headers(response.headers);
    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
    newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");

    return new Response(response.body, {
      status:     response.status,
      statusText: response.statusText,
      headers:    newHeaders,
    });
  }

  self.addEventListener("fetch", e => e.respondWith(handleFetch(e.request)));

} else {
  // ── Main thread scope ─────────────────────────────────────────────────────
  if (!window.crossOriginIsolated) {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(window.location.href)
        .then(reg => {
          if (reg.active && !navigator.serviceWorker.controller) {
            window.location.reload();
          }
        })
        .catch(err => console.warn("[coi-sw] Registration failed:", err));
    } else {
      console.warn("[coi-sw] Service workers not supported — SharedArrayBuffer may be unavailable.");
    }
  }
}
