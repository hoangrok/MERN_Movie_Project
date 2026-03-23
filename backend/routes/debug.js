import express from "express";
import { makeStreamUrl } from "../utils/streamToken.js";

const router = express.Router();

router.get("/stream-url/:videoId", (req, res) => {
  res.json({ hls: makeStreamUrl(req.params.videoId) });
});

export default router;