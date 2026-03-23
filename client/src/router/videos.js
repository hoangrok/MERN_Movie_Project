import { makeStreamUrl } from "../utils/streamToken.js";
import Video from "../models/Video.js";

router.get("/:id/stream", async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ message: "Not found" });
  if (video.status !== "ready") return res.status(409).json({ message: "Not ready" });

  // TODO: check quyền xem sau (subscription/ppv...)
  res.json({ hls: makeStreamUrl(video._id.toString()) });
});