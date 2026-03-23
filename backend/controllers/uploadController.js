// backend/controllers/uploadController.js
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../utils/r2");

exports.uploadVideo = async (req, res) => {
  try {
    // ===== Auth / Admin check =====
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // ===== Validate file =====
    if (!req.files || !req.files.video) {
      return res.status(400).json({ success: false, message: "No video uploaded" });
    }
    const file = req.files.video;
    const allowedTypes = ["video/mp4"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ success: false, message: "Invalid file type" });
    }
    if (file.size > 2 * 1024 * 1024 * 1024) { // max 2GB
      return res.status(400).json({ success: false, message: "File too large" });
    }

    const fileName = `${Date.now()}-${file.name}`;
    const tempDir = path.join(__dirname, "../tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const tempPath = path.join(tempDir, fileName);

    await file.mv(tempPath);

    // ===== Convert mp4 → HLS =====
    const outputDir = path.join(tempDir, `${fileName}-hls`);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    await new Promise((resolve, reject) => {
      ffmpeg(tempPath)
        .outputOptions([
          "-profile:v baseline",
          "-level 3.0",
          "-start_number 0",
          "-hls_time 10",
          "-hls_list_size 0",
          "-f hls",
        ])
        .output(path.join(outputDir, "master.m3u8"))
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // ===== Upload HLS files to R2 =====
    const files = fs.readdirSync(outputDir);
    for (const f of files) {
      const filePath = path.join(outputDir, f);
      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: `videos/${fileName}/${f}`,
          Body: fs.readFileSync(filePath),
          ContentType: f.endsWith(".m3u8")
            ? "application/vnd.apple.mpegurl"
            : "video/MP2T",
        })
      );
    }

    const masterUrl = `https://media-worker.hoang-media.workers.dev/videos/${fileName}/master.m3u8`;

    // ===== Cleanup =====
    fs.rmSync(tempPath);
    fs.rmSync(outputDir, { recursive: true });

    return res.json({ success: true, hlsUrl: masterUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};