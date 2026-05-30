const CACHE_NAME = "htk-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip API calls
  if (request.url.includes("/api/") || request.url.includes(".netlify/functions/")) {
    return;
  }

  // Network first for HTML
  if (request.method === "GET" && request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache first for assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response;
      return fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          if (request.destination === "image") {
            return caches.match("/placeholder.svg");
          }
        });
    })
  );
});

// Background sync for offline bookings
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-bookings") {
    event.waitUntil(syncBookings());
  }
});

async function syncBookings() {
  try {
    const db = await openIndexedDB();
    const pendingBookings = await getPendingBookings(db);

    for (const booking of pendingBookings) {
      try {
        await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(booking)
        });
        await removePendingBooking(db, booking.id);
      } catch (error) {
        console.error("Failed to sync booking:", error);
      }
    }
  } catch (error) {
    console.error("Sync failed:", error);
    throw error;
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("HTKCenter", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
