const express = require("express");
const router = express.Router();
const { createFeedback, getFeedbacks, updateStatus } = require("../controllers/feedbackController");
const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

router.post("/", optionalAuth, createFeedback);
router.get("/", protect, adminOnly, getFeedbacks);
router.patch("/:id/status", protect, adminOnly, updateStatus);

module.exports = router;
