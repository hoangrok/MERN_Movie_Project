const express = require("express");
const router = express.Router();

const {
  getPublicAds,
  getAdminAds,
  createAd,
  updateAd,
  deleteAd,
  trackAdClick,
} = require("../controllers/adController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

router.get("/", getPublicAds);
router.post("/:id/click", trackAdClick);

router.get("/admin", protect, adminOnly, getAdminAds);
router.post("/", protect, adminOnly, createAd);
router.put("/:id", protect, adminOnly, updateAd);
router.delete("/:id", protect, adminOnly, deleteAd);

module.exports = router;
