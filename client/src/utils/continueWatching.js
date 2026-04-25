import { API_URL } from "./api";

const STORAGE_KEY = "dam18_continue_watching";

function safeParse(value, fallback = []) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function emitContinueWatchingUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("continue-watching-updated"));
  }
}

function normalizeMovie(movie = {}, currentTime = 0, duration = 0) {
  const id = movie?._id || movie?.id;
  if (!id) return null;

  const safeDuration = Number(duration || movie?.duration || 0);
  const safeCurrentTime = Number(currentTime || movie?.currentTime || 0);
  const rawUpdatedAt = movie?.lastWatchedAt || movie?.updatedAt;
  const parsedUpdatedAt = Number(rawUpdatedAt);
  const updatedAt = Number.isFinite(parsedUpdatedAt)
    ? parsedUpdatedAt
    : rawUpdatedAt
    ? Date.parse(rawUpdatedAt) || Date.now()
    : Date.now();

  const progress =
    safeDuration > 0
      ? Math.max(0, Math.min((safeCurrentTime / safeDuration) * 100, 100))
      : 0;

  return {
    _id: String(id),
    id: String(id),
    title:
      typeof movie?.title === "string" && movie.title.trim()
        ? movie.title.trim()
        : "Untitled",
    poster:
      typeof movie?.poster === "string" && movie.poster.trim()
        ? movie.poster.trim()
        : "",
    backdrop:
      typeof movie?.backdrop === "string" && movie.backdrop.trim()
        ? movie.backdrop.trim()
        : "",
    genre: Array.isArray(movie?.genre)
      ? movie.genre
      : Array.isArray(movie?.genres)
      ? movie.genres
      : [],
    year: movie?.year || "",
    rating: movie?.rating || "",
    duration: safeDuration,
    currentTime: safeCurrentTime,
    progress,
    previewUrl:
      typeof movie?.previewUrl === "string" ? movie.previewUrl : "",
    previewTimeline: movie?.previewTimeline || null,
    trailer:
      typeof movie?.trailer === "string"
        ? movie.trailer
        : typeof movie?.trailerUrl === "string"
        ? movie.trailerUrl
        : "",
    trailerUrl:
      typeof movie?.trailerUrl === "string"
        ? movie.trailerUrl
        : typeof movie?.trailer === "string"
        ? movie.trailer
        : "",
    updatedAt,
    lastWatchedAt: updatedAt,
  };
}

export function getContinueWatching() {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  const list = safeParse(raw, []);

  return list
    .map((item) => normalizeMovie(item, item?.currentTime, item?.duration))
    .filter(Boolean)
    .filter((item) => Number(item.currentTime) > 0)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

export function saveContinueWatching(movie, currentTime = 0, duration = 0) {
  if (typeof window === "undefined") return;

  const normalized = normalizeMovie(movie, currentTime, duration);
  if (!normalized) return;
  normalized.updatedAt = Date.now();
  normalized.lastWatchedAt = normalized.updatedAt;

  if (
    normalized.duration > 0 &&
    normalized.currentTime >= Math.max(normalized.duration - 15, normalized.duration * 0.97)
  ) {
    removeContinueWatching(normalized._id);
    return;
  }

  const currentList = getContinueWatching().filter(
    (item) => String(item._id) !== String(normalized._id)
  );

  const nextList = [normalized, ...currentList].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  emitContinueWatchingUpdated();
}

export async function syncContinueWatchingWithServer() {
  const list = getContinueWatching();

  if (typeof window === "undefined" || list.length === 0) {
    return list;
  }

  const ids = [
    ...new Set(
      list
        .map((item) => String(item?._id || item?.id || "").trim())
        .filter(Boolean)
    ),
  ];

  if (ids.length === 0) return list;

  try {
    const res = await fetch(
      `${API_URL}/movies/validate?ids=${encodeURIComponent(ids.join(","))}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    if (!res.ok || !data?.success || !Array.isArray(data.validIds)) {
      return list;
    }

    const validIds = new Set(data.validIds.map((item) => String(item)));
    const nextList = list.filter((item) => validIds.has(String(item._id)));

    if (nextList.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
      emitContinueWatchingUpdated();
    }

    return nextList;
  } catch (err) {
    console.error("sync continue watching error:", err);
    return list;
  }
}

export function removeContinueWatching(movieId) {
  if (typeof window === "undefined") return;

  const nextList = getContinueWatching().filter(
    (item) => String(item._id) !== String(movieId)
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  emitContinueWatchingUpdated();
}

export function clearContinueWatching() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
  emitContinueWatchingUpdated();
}

export function formatRemainingTime(movie) {
  const duration = Number(movie?.duration || 0);
  const currentTime = Number(movie?.currentTime || 0);

  if (!duration || duration <= currentTime) return "Sắp xong";

  const remaining = duration - currentTime;
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (hours > 0) return `${hours} giờ ${minutes} phút còn lại`;
  if (minutes > 0) return `${minutes} phút còn lại`;

  return "Sắp xong";
}
