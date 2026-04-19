const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const mongoose = require("mongoose");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const r2 = require("../utils/r2");
const Movie = require("../models/Movie");
const { addJob, getQueueSnapshot } = require("../utils/videoJobQueue");
const generatePreviewTimeline = require("../utils/generatePreviewTimeline");
const { generateVideoBackdrop } = require("../utils/generateVideoBackdrop");

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
  if (file.endsWith(".json")) return "application/json";
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

const ffprobeAsync = (videoPath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });

const cleanup = (...paths) => {
  for (const target of paths) {
    if (!target) continue;
    try {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn("cleanup error:", err.message);
    }
  }
};

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);

const canUseCopyMode = async (videoPath) => {
  try {
    const probe = await ffprobeAsync(videoPath);
    const streams = probe?.streams || [];

    const videoStream = streams.find((s) => s.codec_type === "video");
    const audioStream = streams.find((s) => s.codec_type === "audio");

    const videoCodec = String(videoStream?.codec_name || "").toLowerCase();
    const audioCodec = String(audioStream?.codec_name || "").toLowerCase();

    const okVideo = ["h264"].includes(videoCodec);
    const okAudio = !audioStream || ["aac", "mp3"].includes(audioCodec);

    return okVideo && okAudio;
  } catch (err) {
    console.error("canUseCopyMode ffprobe error:", err.message);
    return false;
  }
};

async function processVideoInBackground({ movieId, tempVideo }) {
  let outputDir = null;
  let previewDir = null;

  try {
    console.log("========== VIDEO BACKGROUND START ==========");
    console.log("movieId:", movieId);

    const movie = await Movie.findById(movieId);
    if (!movie) throw new Error("Movie not found");

    movie.status = "processing";
    movie.processingError = "";
    await movie.save();

    const tmpDir = path.join(__dirname, "../tmp");
    ensureDir(tmpDir);

    outputDir = path.join(tmpDir, `${movieId}-hls`);
    ensureDir(outputDir);

    const canCopy = await canUseCopyMode(tempVideo);
    console.log("copy mode:", canCopy);

    const masterPath = path.join(outputDir, "master.m3u8");

    if (canCopy) {
      console.log("3️⃣ Bắt đầu convert HLS COPY MODE");

      await withTimeout(
        new Promise((resolve, reject) => {
          ffmpeg(tempVideo)
            .outputOptions([
              "-c copy",
              "-start_number 0",
              "-hls_time 6",
              "-hls_list_size 0",
              "-hls_playlist_type vod",
              `-hls_segment_filename ${path.join(outputDir, "seg_%03d.ts")}`,
              "-f hls",
            ])
            .output(masterPath)
            .on("start", (cmd) => {
              console.log("FFMPEG HLS COPY CMD:", cmd);
            })
            .on("end", resolve)
            .on("error", reject)
            .run();
        }),
        1000 * 60 * 8,
        "HLS copy convert"
      );
    } else {
      console.log("3️⃣ Bắt đầu convert HLS SAFE MODE");

      await withTimeout(
        new Promise((resolve, reject) => {
          ffmpeg(tempVideo)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
              "-preset ultrafast",
              "-crf 30",
              "-threads 1",
              "-hls_time 6",
              "-hls_list_size 0",
              "-hls_playlist_type vod",
              "-vf scale=854:-2",
              `-hls_segment_filename ${path.join(outputDir, "seg_%03d.ts")}`,
              "-f hls",
            ])
            .output(masterPath)
            .on("start", (cmd) => {
              console.log("FFMPEG HLS SAFE CMD:", cmd);
            })
            .on("end", resolve)
            .on("error", reject)
            .run();
        }),
        1000 * 60 * 15,
        "HLS safe convert"
      );
    }

    console.log("4️⃣ Convert xong");

    const files = fs.readdirSync(outputDir);
    if (!files.includes("master.m3u8")) {
      throw new Error("master.m3u8 not generated");
    }

    console.log("5️⃣ Upload R2 bắt đầu");

    for (const f of files) {
      const filePath = path.join(outputDir, f);
      if (!fs.statSync(filePath).isFile()) continue;

      await uploadFileToR2(
        `videos/${movieId}/hls/${f}`,
        fs.readFileSync(filePath),
        getContentType(f)
      );
    }

    console.log("6️⃣ Upload R2 xong");

    // =========================
    // SMART MEDIA GENERATION
    // =========================
    console.log("7️⃣ Generate preview + poster + backdrop");

    let previewResult = null;
    let backdropResult = null;

    try {
      previewDir = path.join(tmpDir, `${movieId}-preview`);
      ensureDir(previewDir);

      previewResult = await generatePreviewTimeline(tempVideo, previewDir, {
        movieId,
        previewCount: 8,
        candidateCount: 18,
      });

      console.log(
        "✅ Preview generated:",
        previewResult?.items?.length || 0,
        "items"
      );
    } catch (err) {
      console.warn("⚠️ Preview generation failed:", err.message);
    }

    try {
      backdropResult = await generateVideoBackdrop(tempVideo, movieId, {
        candidateCount: 12,
        width: 1920,
        height: 1080,
      });
      console.log("✅ Backdrop generated");
    } catch (err) {
      console.warn("⚠️ Backdrop generation failed:", err.message);
    }

    // =========================
    // SAVE DATA TO MOVIE
    // =========================
    const streamBase = (process.env.STREAM_BASE_URL || "").replace(/\/+$/, "");
    movie.hlsUrl = streamBase
      ? `${streamBase}/videos/${movieId}/hls/master.m3u8`
      : `/videos/${movieId}/hls/master.m3u8`;

    if (previewResult?.items?.length) {
      movie.previewTimeline = {
        duration: previewResult.duration || 0,
        interval: previewResult.interval || 0,
        items: previewResult.items || [],
      };

      movie.thumbnailPickedAt = previewResult.bestFrame?.second || null;
    }

    if (!movie.poster && previewResult?.posterUrl) {
      movie.poster = previewResult.posterUrl;
    }

    if (backdropResult?.backdropUrl) {
      movie.backdrop = backdropResult.backdropUrl;
    }

    movie.status = "ready";
    movie.processingError = "";
    await movie.save();

    console.log("========== VIDEO BACKGROUND DONE ==========");
  } catch (err) {
    console.error("❌ BACKGROUND VIDEO ERROR:", err);

    try {
      const movie = await Movie.findById(movieId);
      if (movie) {
        movie.status = "failed";
        movie.processingError = err.message || "Video processing failed";
        await movie.save();
      }
    } catch (saveErr) {
      console.error("Save failed status error:", saveErr);
    }
  } finally {
    cleanup(tempVideo, outputDir, previewDir);
  }
}

// ==========================
// PRE-FLIGHT
// ==========================

router.options("/video/:movieId", (req, res) => res.sendStatus(204));
router.options("/image", (req, res) => res.sendStatus(204));
router.options("/status/:movieId", (req, res) => res.sendStatus(204));
router.options("/queue", (req, res) => res.sendStatus(204));

// ==========================
// DEBUG QUEUE
// ==========================

router.get("/queue", (req, res) => {
  return res.json({
    success: true,
    ...getQueueSnapshot(),
  });
});

// ==========================
// STATUS
// ==========================

router.get("/status/:movieId", async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie id",
      });
    }

    const movie = await Movie.findById(movieId).select(
      "_id title status hlsUrl poster backdrop previewTimeline processingError thumbnailPickedAt"
    );

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.json({
      success: true,
      movie,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

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
    const safeName = cleanFileBaseName(baseName);

    const fileName = `${Date.now()}-${safeName || "image"}${ext}`;
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
// UPLOAD VIDEO BACKGROUND
// ==========================

router.post("/video/:movieId", async (req, res) => {
  let tempVideo = null;

  try {
    const { movieId } = req.params;
    const file = req.files?.video;

    console.log("========== VIDEO UPLOAD REQUEST ==========");
    console.log("movieId:", movieId);
    console.log("origin:", req.headers.origin || "no-origin");
    console.log("content-length:", req.headers["content-length"] || "unknown");

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

    const originalName = file.name || "video.mp4";
    const ext = path.extname(originalName).toLowerCase() || ".mp4";
    const baseName = path.parse(originalName).name;
    const safeBaseName = cleanFileBaseName(baseName);

    const tmpDir = path.join(__dirname, "../tmp");
    ensureDir(tmpDir);

    const safeLocalName = `${Date.now()}-${safeBaseName || "video"}${ext}`;
    tempVideo = path.join(tmpDir, safeLocalName);

    console.log("1️⃣ Nhận file:", file.name, file.size);
    await file.mv(tempVideo);
    console.log("2️⃣ Save temp video xong:", tempVideo);

    movie.status = "queued";
    movie.processingError = "";
    await movie.save();

    addJob(async () => {
      await processVideoInBackground({
        movieId,
        tempVideo,
      });
    });

    return res.json({
      success: true,
      queued: true,
      movieId,
      status: "queued",
      message: "Video đã upload xong và được đưa vào hàng chờ xử lý nền",
    });
  } catch (err) {
    console.error("upload video enqueue error:", err);

    cleanup(tempVideo);

    return res.status(500).json({
      success: false,
      message: err.message || "Upload video failed",
    });
  }
});

module.exports = router;