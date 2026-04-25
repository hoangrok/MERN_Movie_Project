// Base API (Vite env)
export const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "https://api.clipdam18.com/api";

// Alias để tương thích code cũ (movie-slice đang dùng)
export const API_URL = API_BASE;

// ===== Generic fetch helper =====
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: options.cache || "no-store",
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data?.message || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

// ===== API functions =====
export async function getMovies(params = "") {
  return apiFetch(`/movies${params ? `?${params}` : ""}`);
}

export async function getTrending() {
  return apiFetch("/movies/trending");
}

export async function getLatestMovies() {
  return apiFetch("/movies/latest");
}

export async function getTopViewedMovies() {
  return apiFetch("/movies/top-viewed");
}

export async function getGenres() {
  return apiFetch("/movies/genres");
}

export async function getMovieDetail(id) {
  return apiFetch(`/movies/${id}`);
}

export async function getMovieStream(id, token) {
  return apiFetch(`/movies/${id}/stream`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
}

export async function getRelatedMovies(id) {
  return apiFetch(`/movies/${id}/related`);
}

export async function incrementView(id) {
  return apiFetch(`/movies/${id}/view`, {
    method: "POST",
    cache: "no-store",
  });
}

// default export (optional)
export default API_BASE;
