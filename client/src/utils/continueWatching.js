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
    trailer:
      typeof movie?.trailer === "string"
        ? movie.trailer
        : typeof movie?.trailerUrl === "string"
        ? movie.trailerUrl
        : "",
    updatedAt: Date.now(),
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