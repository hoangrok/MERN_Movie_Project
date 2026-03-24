const router = require("express").Router();

const {
  registerUser,
  loginUser,
  getProfile,
  addtoLikedMovies,
  getLikedMovies,
  removeFromLikedMovies,
} = require("../controllers/UserControl");

const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getProfile);

router.get("/liked", protect, getLikedMovies);
router.post("/add", protect, addtoLikedMovies);
router.put("/remove", protect, removeFromLikedMovies);

module.exports = router;