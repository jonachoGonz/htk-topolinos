import { useEffect, useState } from "react";

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.log("Service Workers not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });
    console.log("Service Worker registered:", registration);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000);

    // Notify user of new version
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          console.log("New service worker available");
          // Could show toast: "App update available, refresh to update"
        }
      });
    });
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
}

export async function requestBackgroundSync() {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
    console.log("Background Sync not supported");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register("sync-bookings");
    console.log("Background sync registered");
  } catch (error) {
    console.error("Background sync registration failed:", error);
  }
}

export async function openIndexedDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("HTKCenter", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("pending-bookings")) {
        db.createObjectStore("pending-bookings", { keyPath: "id" });
      }
    };
  });
}
