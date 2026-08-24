/* coi-serviceworker - enables SharedArrayBuffer on static sites via COOP/COEP headers */
if (typeof window === "undefined") {
  // ── Service Worker scope ──────────────────────────────────────────────────
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

  async function handleFetch(request) {
    if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;
    let response;
    try {
      response = await fetch(request);
    } catch (_) {
      return new Response(null, { status: 503 });
    }
    if (response.status === 0) return response;

    const headers = new Headers(response.headers);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "credentialless");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  self.addEventListener("fetch", e => e.respondWith(handleFetch(e.request)));

} else {
  // ── Main thread scope ─────────────────────────────────────────────────────
  if (window.crossOriginIsolated) {
    // Already isolated — clean up any reload flag
    sessionStorage.removeItem("coi-reloaded");
  } else if ("serviceWorker" in navigator) {
    // Use the actual script URL so the SW file is registered correctly
    const swUrl = (document.currentScript && document.currentScript.src)
      || "/coi-serviceworker.js";

    function reloadOnce() {
      if (!sessionStorage.getItem("coi-reloaded")) {
        sessionStorage.setItem("coi-reloaded", "1");
        location.reload();
      } else {
        console.warn("[coi-sw] Already reloaded once but crossOriginIsolated is still false. " +
          "Your host may not support service workers properly.");
      }
    }

    navigator.serviceWorker.register(swUrl).then(reg => {
      if (reg.installing) {
        // First-ever install — wait for it to activate, then reload
        reg.installing.addEventListener("statechange", e => {
          if (e.target.state === "activated") reloadOnce();
        });
      } else if (reg.waiting) {
        // SW waiting to take over — skip waiting then reload
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
        reloadOnce();
      } else if (!navigator.serviceWorker.controller) {
        // SW active but not yet controlling this page — reload once
        reloadOnce();
      }
    }).catch(err => console.warn("[coi-sw] Registration failed:", err));
  } else {
    console.warn("[coi-sw] Service workers not supported — SharedArrayBuffer unavailable.");
  }
}

