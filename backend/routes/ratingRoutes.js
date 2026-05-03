const router = require("express").Router();
const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { rateMovie, getMyRating, getMovieRating } = require("../controllers/ratingController");

router.get("/movie/:movieId", optionalAuth, getMovieRating);
router.get("/my/:movieId", protect, getMyRating);
router.post("/", protect, rateMovie);

module.exports = router;
