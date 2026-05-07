const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Movie = require("../models/Movie");

const {
  getMovies,
  getLatestMovies,
  getTopViewedMovies,
  getGenres,
  getMovieById,
  validateMovieIds,
  createMovie,
  updateMovie,
  deleteMovie,
  getStreamUrl,
  getRelatedMovies,
  incrementView,
  getTrending,
  getSeriesEpisodes,
} = require("../controllers/movieController");

const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

const TMDB_GENRE_MAP = {
  28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",
  99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",
  27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Sci-Fi",
  53:"Thriller",10752:"War",37:"Western",10770:"TV Movie",
};

// List / Search
router.get("/", getMovies);

// Special pages
router.get("/trending", getTrending);
router.get("/latest", getLatestMovies);
router.get("/top-viewed", getTopViewedMovies);
router.get("/genres", getGenres);
router.get("/validate", validateMovieIds);

// Series episodes
router.get("/series/:seriesId", getSeriesEpisodes);

// Reorder episodes within a season
router.put("/series/:seriesId/reorder", protect, adminOnly, async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { season = 1, order } = req.body; // order: [{ _id, episode }]

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ success: false, message: "order array required" });
    }

    const ops = order
      .filter(({ _id }) => mongoose.Types.ObjectId.isValid(_id))
      .map(({ _id, episode }, i) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(_id), seriesId },
          update: { $set: { episode: Number(episode ?? i + 1) } },
        },
      }));

    if (ops.length) await Movie.bulkWrite(ops);

    return res.json({ success: true, message: `Đã cập nhật thứ tự ${ops.length} tập` });
  } catch (err) {
    console.error("reorder-episodes error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// TMDB auto-fill proxy (admin only, keeps API key server-side)
router.get("/tmdb-search", protect, adminOnly, async (req, res) => {
  try {
    const { q, lang = "vi" } = req.query;
    if (!String(q || "").trim()) return res.json({ success: true, results: [] });

    const key = process.env.TMDB_API_KEY;
    if (!key) return res.status(500).json({ success: false, message: "TMDB_API_KEY chưa cấu hình trong .env" });

    const url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(q)}&language=${lang}&include_adult=false&page=1`;
    const tmdbRes = await fetch(url);
    const data = await tmdbRes.json();

    const results = (data?.results || []).slice(0, 8).map((m) => ({
      tmdbId: m.id,
      title: m.title,
      originalTitle: m.original_title,
      overview: m.overview || "",
      poster: m.poster_path   ? `https://image.tmdb.org/t/p/w500${m.poster_path}`   : "",
      backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : "",
      year: m.release_date ? m.release_date.slice(0, 4) : "",
      rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : 0,
      genres: (m.genre_ids || []).map((id) => TMDB_GENRE_MAP[id]).filter(Boolean),
    }));

    return res.json({ success: true, results });
  } catch (err) {
    console.error("tmdb-search error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// TMDB full details (for duration / runtime)
router.get("/tmdb-details/:tmdbId", protect, adminOnly, async (req, res) => {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) return res.status(500).json({ success: false, message: "TMDB_API_KEY chưa cấu hình" });

    const url = `https://api.themoviedb.org/3/movie/${req.params.tmdbId}?api_key=${key}&language=vi`;
    const tmdbRes = await fetch(url);
    const m = await tmdbRes.json();

    return res.json({
      success: true,
      duration: m.runtime || 0,
      tagline: m.tagline || "",
      overview: m.overview || "",
      genres: (m.genres || []).map((g) => g.name),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// HLS AES-128 key delivery — open endpoint, protection comes from signed+expiring segment URLs
router.get("/hls-key/:movieId", async (req, res) => {
  try {
    const { movieId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(movieId)) return res.status(404).end();

    const movie = await Movie.findById(movieId).select("hlsKey");
    if (!movie?.hlsKey) return res.status(404).end();

    const keyBuf = Buffer.from(movie.hlsKey, "hex");
    res
      .set("Content-Type", "application/octet-stream")
      .set("Content-Length", String(keyBuf.length))
      .set("Cache-Control", "no-store, no-cache, must-revalidate, private")
      .send(keyBuf);
  } catch (err) {
    console.error("hls-key error:", err);
    res.status(500).end();
  }
});

// Admin CRUD
router.post("/", protect, adminOnly, createMovie);
router.put("/:id", protect, adminOnly, updateMovie);
router.delete("/:id", protect, adminOnly, deleteMovie);

// Signed stream url
router.get("/:id/stream", optionalAuth, getStreamUrl);

// Related movies
router.get("/:id/related", getRelatedMovies);

// Increment views
router.post("/:id/view", incrementView);

// Movie detail
router.get("/:id", optionalAuth, getMovieById);

module.exports = router;
