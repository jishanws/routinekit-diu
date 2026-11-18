import { PublishedRoutine, RoutineStatusInfo } from "@/types/routine";

const CACHED_ROUTINE_KEY = "routinekit_cached_routine";
const CACHED_STATUS_KEY = "routinekit_cached_status";

let inMemoryRoutine: PublishedRoutine | null = null;
let inMemoryStatus: RoutineStatusInfo | null = null;

/**
 * Synchronously retrieves cached routine from memory or localStorage.
 * Enables 0ms instantaneous first paint on repeat visits and full offline capability.
 */
export function getCachedRoutine(): PublishedRoutine | null {
  if (inMemoryRoutine) return inMemoryRoutine;
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CACHED_ROUTINE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublishedRoutine;
    if (parsed && Array.isArray(parsed.classes) && parsed.classes.length > 0) {
      inMemoryRoutine = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to read cached routine from localStorage:", err);
  }
  return null;
}

/**
 * Persists routine in memory, localStorage, and Cache API for offline usage.
 */
export function setCachedRoutine(data: PublishedRoutine): void {
  if (!data || !Array.isArray(data.classes)) return;
  inMemoryRoutine = data;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CACHED_ROUTINE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("Failed to save routine to localStorage (quota exceeded?):", err);
    }

    // Also persist in Cache API for Service Worker offline retrieval
    if ("caches" in window) {
      caches.open("routinekit-data-v1").then((cache) => {
        cache.put(
          "/data/routine-latest.json",
          new Response(JSON.stringify(data), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300",
            },
          })
        ).catch(() => {});
      }).catch(() => {});
    }
  }
}

/**
 * Fetches published routine with automatic offline fallback.
 * If network fails or user is offline, returns cached routine seamlessly.
 */
export async function fetchPublishedRoutine(): Promise<PublishedRoutine> {
  try {
    const res = await fetch("/data/routine-latest.json", {
      cache: "default",
    });

    if (!res.ok) {
      throw new Error(`Failed to load routine data: HTTP ${res.status}`);
    }

    const data: PublishedRoutine = await res.json();
    setCachedRoutine(data);
    return data;
  } catch (netErr) {
    // Network failed or offline: check if we have a valid cached routine
    const fallback = getCachedRoutine();
    if (fallback) {
      return fallback;
    }
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cacheMatch = await caches.match("/data/routine-latest.json");
        if (cacheMatch) {
          const cachedJson: PublishedRoutine = await cacheMatch.json();
          if (cachedJson && Array.isArray(cachedJson.classes) && cachedJson.classes.length > 0) {
            inMemoryRoutine = cachedJson;
            return cachedJson;
          }
        }
      } catch {
        // Ignore cache match error and proceed to throw original netErr
      }
    }
    throw netErr;
  }
}

/**
 * Synchronously retrieves cached status info.
 */
export function getCachedStatus(): RoutineStatusInfo | null {
  if (inMemoryStatus) return inMemoryStatus;
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CACHED_STATUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoutineStatusInfo;
    if (parsed && parsed.current_version) {
      inMemoryStatus = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

export async function fetchRoutineStatus(): Promise<RoutineStatusInfo> {
  try {
    const res = await fetch("/data/status.json", {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to load status info: HTTP ${res.status}`);
    }
    const data: RoutineStatusInfo = await res.json();
    inMemoryStatus = data;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(CACHED_STATUS_KEY, JSON.stringify(data));
      } catch {}
    }
    return data;
  } catch (err) {
    const cached = getCachedStatus();
    if (cached) return cached;
    throw err;
  }
}
