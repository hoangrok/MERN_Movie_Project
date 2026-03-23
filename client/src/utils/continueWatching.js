const STORAGE_KEY = "dam18_continue_watching";

export function saveContinueWatching(movie) {
  if (!movie?._id) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];

    const currentTime = Number(movie.currentTime || 0);
    const duration = Number(movie.duration || 0);
    const progressPercent =
      duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

    const filtered = list.filter((item) => item._id !== movie._id);

    const next = [
      {
        _id: movie._id,
        title: movie.title || "",
        poster: movie.poster || "",
        backdrop: movie.backdrop || "",
        genre: movie.genre || movie.genres || [],
        year: movie.year || "",
        duration,
        currentTime,
        progressPercent,
        updatedAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 20);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error("saveContinueWatching error:", err);
  }
}

export function getContinueWatching() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("getContinueWatching error:", err);
    return [];
  }
}

export function removeContinueWatching(movieId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = list.filter((item) => item._id !== movieId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error("removeContinueWatching error:", err);
  }
}

export function clearContinueWatching() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("clearContinueWatching error:", err);
  }
}