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
export async function getSignedStreamUrl(id) {
  const res = await fetch(`${API_BASE}/movies/${id}/stream`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch signed stream url");
  }

  const data = await res.json();

  return data?.signedUrl || data?.url || "";
}
export async function getRelatedMovies(slug, limit = 12) {
  const movies = await getAdultMovies();
  const current = movies.find((movie) => movie?.slug === slug);

  if (!current) return movies.slice(0, limit);

  const currentGenres = Array.isArray(current.genre) ? current.genre : [];
  const currentTitle = String(current.title || "").toLowerCase();

  const scored = movies
    .filter((movie) => movie?.slug !== slug)
    .map((movie) => {
      let score = 0;

      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [];
      const sharedGenres = movieGenres.filter((g) => currentGenres.includes(g));

      score += sharedGenres.length * 10;

      if (
        currentTitle &&
        String(movie.title || "")
          .toLowerCase()
          .includes(currentTitle.split(" ")[0] || "")
      ) {
        score += 2;
      }

      if (movie?.newPopular) score += 1;
      if (movie?.featured) score += 1;

      const updatedAt = new Date(
        movie?.updatedAt || movie?.createdAt || 0
      ).getTime();

      return {
        ...movie,
        _relatedScore: score,
        _updatedAt: updatedAt,
      };
    })
    .sort((a, b) => {
      if (b._relatedScore !== a._relatedScore) {
        return b._relatedScore - a._relatedScore;
      }

      return b._updatedAt - a._updatedAt;
    });

  return scored.slice(0, limit);
}