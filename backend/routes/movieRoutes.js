const express = require("express");
const router = express.Router();

const {
  getMovies,
  getLatestMovies,
  getTopViewedMovies,
  getGenres,
  getMovieById,
  createMovie,
  getStreamUrl,
  getRelatedMovies,
  incrementView,
  getTrending,
} = require("../controllers/movieController");

// List / Search
router.get("/", getMovies);

// Special pages
router.get("/trending", getTrending);
router.get("/latest", getLatestMovies);
router.get("/top-viewed", getTopViewedMovies);
router.get("/genres", getGenres);

// Movie detail
router.get("/:id", getMovieById);

// Create movie
router.post("/", createMovie);

// Signed stream url
router.get("/:id/stream", getStreamUrl);

// Related movies
router.get("/:id/related", getRelatedMovies);

// Increment views
router.post("/:id/view", incrementView);

module.exports = router;