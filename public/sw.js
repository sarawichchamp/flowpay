/* global URL */

const CACHE_NAME = "flowpay-v3";
const OFFLINE_URLS = ["/", "/manifest.webmanifest"];
const STATIC_DESTINATIONS = new Set(["style", "script", "font", "image"]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isApiRequest = requestUrl.pathname.startsWith("/api/");
  const isNavigationRequest = event.request.mode === "navigate";
  const isStaticAsset = STATIC_DESTINATIONS.has(event.request.destination);

  if (isApiRequest) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  if (!isStaticAsset) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = { title: "FlowPay", body: event.data.text() };
  }

  const { title = "FlowPay", body = "", url = "/transactions", tag = "flowpay-push" } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
      badge: "/icons/icon-192.svg",
      icon: "/icons/icon-192.svg"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/transactions";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
