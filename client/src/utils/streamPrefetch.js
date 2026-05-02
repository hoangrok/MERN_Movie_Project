import { API_URL } from "./api";

const STREAM_TTL_MS = 1000 * 60 * 8;
const STORAGE_KEY = "prefetched-stream-cache-v1";
const memoryCache = new Map();
const inflightStreamRequests = new Map();
const warmedManifestUrls = new Set();
const primedVideoUrls = new Set();

function readStorage() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(cacheObject) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cacheObject));
  } catch {}
}

function isFresh(entry) {
  return !!entry?.url && Number(entry.expiresAt || 0) > Date.now();
}

export function getPrefetchedStream(movieId) {
  if (!movieId) return "";

  const inMemory = memoryCache.get(String(movieId));
  if (isFresh(inMemory)) return inMemory.url;

  const storageCache = readStorage();
  const stored = storageCache[String(movieId)];
  if (!isFresh(stored)) return "";

  memoryCache.set(String(movieId), stored);
  return stored.url;
}

export function cachePrefetchedStream(movieId, url, ttlMs = STREAM_TTL_MS) {
  if (!movieId || !url) return url;

  const entry = {
    url,
    expiresAt: Date.now() + ttlMs,
  };

  memoryCache.set(String(movieId), entry);
  const storageCache = readStorage();
  storageCache[String(movieId)] = entry;
  writeStorage(storageCache);
  return url;
}

export async function prefetchMovieStream(movieId) {
  if (!movieId) return "";

  const cached = getPrefetchedStream(movieId);
  if (cached) {
    warmStreamManifest(cached);
    primeStreamVideo(cached);
    return cached;
  }

  const pending = inflightStreamRequests.get(String(movieId));
  if (pending) return pending;

  const request = fetch(`${API_URL}/movies/${movieId}/stream`, {
    cache: "no-store",
  })
    .then(async (res) => {
      const data = await res.json();

      if (!res.ok || !data?.success || !data?.signedUrl) {
        throw new Error(data?.message || "Cannot prefetch stream");
      }

      const nextUrl = cachePrefetchedStream(movieId, data.signedUrl);
      warmStreamManifest(nextUrl);
      primeStreamVideo(nextUrl);
      return nextUrl;
    })
    .finally(() => {
      inflightStreamRequests.delete(String(movieId));
    });

  inflightStreamRequests.set(String(movieId), request);
  return request;
}

export function warmStreamManifest(url) {
  if (!url || typeof window === "undefined") return;
  if (!/\.m3u8($|\?)/i.test(url)) return;
  if (warmedManifestUrls.has(url)) return;

  warmedManifestUrls.add(url);

  window
    .fetch(url, {
      method: "GET",
      cache: "force-cache",
      mode: "cors",
    })
    .then(async (res) => {
      const text = await res.text().catch(() => "");
      const firstSegmentUrl = getFirstSegmentUrl(url, text);
      if (!firstSegmentUrl) return;

      return window.fetch(firstSegmentUrl, {
        method: "GET",
        cache: "force-cache",
        mode: "cors",
      });
    })
    .catch(() => {});
}

export function primeStreamVideo(url) {
  if (!url || typeof document === "undefined") return;
  if (/\.m3u8($|\?)/i.test(url) === false) return;
  if (primedVideoUrls.has(url)) return;

  primedVideoUrls.add(url);

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  video.setAttribute("aria-hidden", "true");
  video.setAttribute("tabindex", "-1");
  video.style.position = "fixed";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  video.style.left = "-9999px";
  video.style.top = "-9999px";

  const cleanup = () => {
    window.setTimeout(() => {
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {}
      video.remove();
    }, 12000);
  };

  video.addEventListener("loadeddata", cleanup, { once: true });
  video.addEventListener("error", cleanup, { once: true });
  document.body.appendChild(video);
  video.load();
}

function getFirstSegmentUrl(manifestUrl, manifestText) {
  if (!manifestText) return "";

  const line = String(manifestText)
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry && !entry.startsWith("#"));

  if (!line) return "";

  try {
    return new URL(line, manifestUrl).toString();
  } catch {
    return "";
  }
}
