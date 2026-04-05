const API_BASE = "https://dam18-api.onrender.com/api";

export async function getAllMovies() {
  const res = await fetch(`${API_BASE}/movies`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch movies");
  }

  const data = await res.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.movies)) return data.movies;

  return [];
}

export async function getAdultMovies() {
  const movies = await getAllMovies();

  return movies
    .filter((movie) => movie?.isPublished !== false)
    .map((movie) => ({
      ...movie,
      displayImage: movie?.poster || movie?.backdrop || "",
      displayBackdrop: movie?.backdrop || movie?.poster || "",
      displayDuration:
        typeof movie?.duration === "number" && movie.duration > 0
          ? formatSeconds(movie.duration)
          : "HD",
      displayViews:
        typeof movie?.views === "number"
          ? `${movie.views.toLocaleString("vi-VN")} lượt xem`
          : "Mới cập nhật",
      previewItems: Array.isArray(movie?.previewTimeline?.items)
        ? movie.previewTimeline.items
        : [],
    }))
    .sort((a, b) => {
      const aDate = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
      const bDate = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
      return bDate - aDate;
    });
}

export async function getMovieBySlug(slug) {
  const movies = await getAdultMovies();
  return movies.find((movie) => movie?.slug === slug) || null;
}

export function formatSeconds(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return "HD";

  const total = Math.floor(Number(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m} phút`;
  return `${s}s`;
}