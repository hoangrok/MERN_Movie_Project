const express = require("express");
const { makeStreamUrl } = require("../utils/streamToken");

const router = express.Router();

// GET /api/debug/stream-url/:videoId
router.get("/stream-url/:videoId", (req, res) => {
  res.json({ hls: makeStreamUrl(req.params.videoId) });
});

module.exports = router;