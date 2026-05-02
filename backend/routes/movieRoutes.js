const express = require("express");
const router = express.Router();

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
