const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const mongoose = require("mongoose");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../utils/r2");
const Movie = require("../models/Movie");

// ==========================
// HELPER
// ==========================

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const getContentType = (file) => {
  if (file.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (file.endsWith(".ts")) return "video/MP2T";
  if (file.endsWith(".m4s")) return "video/iso.segment";
  if (file.endsWith(".mp4")) return "video/mp4";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
};

const cleanFileBaseName = (name = "") => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
};

const uploadFileToR2 = async (key, body, contentType) => {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
};

// ==========================
// UPLOAD IMAGE
// ==========================

router.post("/image", async (req, res) => {
  try {
    const file = req.files?.image;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    const originalName = file.name || "image.jpg";
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.parse(originalName).name;
    const cleanBaseName = cleanFileBaseName(baseName);

    const fileName = `${Date.now()}-${cleanBaseName || "image"}${ext}`;
    const key = `images/${fileName}`;

    await uploadFileToR2(key, file.data, getContentType(fileName));

    const publicBase = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    const url = `${publicBase}/${key}`;

    return res.json({
      success: true,
      url,
    });
  } catch (err) {
    console.error("upload image error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ==========================
// UPLOAD VIDEO -> HLS -> R2
// POST /api/upload/video/:movieId
// ==========================

router.post("/video/:movieId", async (req, res) => {
  let tempVideo = null;
  let outputDir = null;

  try {
    const { movieId } = req.params;
    const file = req.files?.video;

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No video uploaded",
      });
    }

    console.log("1️⃣ Nhận file:", file.name, file.size);

    const originalName = file.name || "video.mp4";
    const ext = path.extname(originalName).toLowerCase() || ".mp4";
    const baseName = path.parse(originalName).name;
    const cleanBaseName = cleanFileBaseName(baseName);

    const tmpDir = path.join(__dirname, "../tmp");
    ensureDir(tmpDir);

    const safeLocalName = `${Date.now()}-${cleanBaseName || "video"}${ext}`;
    tempVideo = path.join(tmpDir, safeLocalName);

    await file.mv(tempVideo);
    console.log("2️⃣ Save temp video xong");

    outputDir = path.join(tmpDir, `${movieId}-hls`);
    const variantDir = path.join(outputDir, "v0");

    ensureDir(outputDir);
    ensureDir(variantDir);

    console.log("3️⃣ Bắt đầu convert HLS");

    await new Promise((resolve, reject) => {
      ffmpeg(tempVideo)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([
          "-preset veryfast",
          "-profile:v main",
          "-crf 23",
          "-sc_threshold 0",
          "-g 48",
          "-keyint_min 48",
          "-hls_time 6",
          "-hls_playlist_type vod",
          "-hls_list_size 0",

          // Giữ nguyên tỷ lệ gốc, chỉ làm tròn về số chẵn để ffmpeg encode ổn
          "-vf scale=trunc(iw/2)*2:trunc(ih/2)*2",

          `-hls_segment_filename ${path.join(variantDir, "seg_%03d.ts")}`,
        ])
        .output(path.join(variantDir, "index.m3u8"))
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    console.log("4️⃣ Convert xong");

    const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2800000
v0/index.m3u8
`;

    fs.writeFileSync(path.join(outputDir, "master.m3u8"), masterContent);

    console.log("5️⃣ Upload R2 bắt đầu");

    const masterPath = path.join(outputDir, "master.m3u8");
    await uploadFileToR2(
      `videos/${movieId}/hls/master.m3u8`,
      fs.readFileSync(masterPath),
      getContentType("master.m3u8")
    );

    const variantFiles = fs.readdirSync(variantDir);
    for (const f of variantFiles) {
      const filePath = path.join(variantDir, f);
      await uploadFileToR2(
        `videos/${movieId}/hls/v0/${f}`,
        fs.readFileSync(filePath),
        getContentType(f)
      );
    }

    console.log("6️⃣ Upload R2 xong");

    const streamBase = (process.env.STREAM_BASE_URL || "").replace(/\/+$/, "");
    if (streamBase) {
      movie.hlsUrl = `${streamBase}/videos/${movieId}/hls/master.m3u8`;
    } else {
      movie.hlsUrl = `/videos/${movieId}/hls/master.m3u8`;
    }

    movie.status = "ready";
    await movie.save();

    if (tempVideo && fs.existsSync(tempVideo)) {
      fs.rmSync(tempVideo, { force: true });
    }
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    return res.json({
      success: true,
      movieId,
      hlsUrl: movie.hlsUrl,
      message: "Video uploaded and converted successfully",
    });
  } catch (err) {
    console.error("upload video error:", err);

    if (tempVideo && fs.existsSync(tempVideo)) {
      fs.rmSync(tempVideo, { force: true });
    }
    if (outputDir && fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;