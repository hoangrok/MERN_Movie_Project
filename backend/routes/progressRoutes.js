const router = require("express").Router();
const Progress = require("../models/Progress");

// Lưu progress
router.post("/", async (req, res) => {
  const { userId, movieId, currentTime } = req.body;
  try {
    const existing = await Progress.findOne({ userId, movieId });
    if (existing) {
      existing.currentTime = currentTime;
      await existing.save();
    } else {
      await Progress.create({ userId, movieId, currentTime });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Lấy progress
router.get("/:userId/:movieId", async (req, res) => {
  const { userId, movieId } = req.params;
  try {
    const prog = await Progress.findOne({ userId, movieId });
    res.json({ success: true, currentTime: prog?.currentTime || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;