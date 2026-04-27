const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const mongoose = require("mongoose");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const r2 = require("../utils/r2");
const Movie = require("../models/Movie");
const { addJob, getQueueSnapshot } = require("../utils/videoJobQueue");
const generatePreviewTimeline = require("../utils/generatePreviewTimeline");
const { generateVideoBackdrop } = require("../utils/generateVideoBackdrop");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

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

const resolveWatermarkAssetPath = (value) => {
  const candidate = String(value || "").trim();
  if (!candidate) return "";

  if (path.isAbsolute(candidate)) {
    return candidate;
  }

  const cwdPath = path.resolve(process.cwd(), candidate);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  return path.resolve(__dirname, "..", candidate);
};

const getWatermarkPngPath = () => {
  const candidates = [
    process.env.WATERMARK_PNG_FILE,
    path.join(__dirname, "..", "tools", "local-hls", "watermark.png"),
    path.join(__dirname, "..", "assets", "watermark.png"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = resolveWatermarkAssetPath(candidate);
    if (resolved && /\.png$/i.test(resolved) && fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return "";
};

const clampNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const buildPngWatermarkFilter = (videoWidth = 1920, videoHeight = 1080) => {
  const fallbackMargin = Number(process.env.WATERMARK_MARGIN) || 0;
  const marginX = Number(process.env.WATERMARK_MARGIN_X) || fallbackMargin || 24;
  const topMargin = Number(process.env.WATERMARK_MARGIN_TOP) || fallbackMargin || 22;
  const bottomMargin = Number(process.env.WATERMARK_MARGIN_BOTTOM) || fallbackMargin || 78;
  const jumpSeconds = Number(process.env.WATERMARK_JUMP_SECONDS) || 7;
  const pngOpacity = clampNumber(process.env.WATERMARK_PNG_OPACITY, 0.9, 0.1, 1);

  // Scale PNG to ~18% of shorter side, capped at WATERMARK_PNG_MAX_WIDTH
  const shorterSide = Math.min(videoWidth, videoHeight);
  const maxW = clampNumber(process.env.WATERMARK_PNG_MAX_WIDTH, 320, 80, 720);
  const pngW = Math.min(maxW, Math.max(88, Math.round(shorterSide * 0.2)));
  const cornerIndex = `mod(floor(t/${jumpSeconds})*7+3,4)`;

  // scale PNG to fixed pixel width (no scale2ref — simpler, more compatible)
  return [
    "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[base]",
    `[1:v]format=rgba,colorchannelmixer=aa=${pngOpacity},scale=${pngW}:-2[wm]`,
    `[base][wm]overlay=` +
      `x='if(eq(${cornerIndex},0),${marginX},if(eq(${cornerIndex},1),main_w-overlay_w-${marginX},if(eq(${cornerIndex},2),${marginX},main_w-overlay_w-${marginX})))':` +
      `y='if(eq(${cornerIndex},0),${topMargin},if(eq(${cornerIndex},1),${topMargin},if(eq(${cornerIndex},2),main_h-overlay_h-${bottomMargin},main_h-overlay_h-${bottomMargin})))'[v]`,
  ].join(";");
};

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

    const watermarkEnabled = process.env.WATERMARK_ENABLED !== "false";
    const canCopy = watermarkEnabled ? false : await canUseCopyMode(tempVideo);
    const watermarkPngPath = watermarkEnabled ? getWatermarkPngPath() : "";

    // Probe video dimensions for dimension-aware filters
    let videoWidth = 1920;
    let videoHeight = 1080;
    try {
      const probe = await ffprobeAsync(tempVideo);
      const vs = probe?.streams?.find((s) => s.codec_type === "video");
      if (vs?.width && vs?.height) {
        videoWidth = vs.width;
        videoHeight = vs.height;
      }
    } catch (e) {
      console.warn("probe dimensions failed, using defaults:", e.message);
    }

    console.log("copy mode:", canCopy);
    console.log("watermark burn-in:", watermarkEnabled);
    console.log("watermark png:", watermarkPngPath || "none");
    console.log("video dimensions:", `${videoWidth}x${videoHeight}`);

    const masterPath = path.join(outputDir, "master.m3u8");

    if (watermarkEnabled) {
      if (!watermarkPngPath) {
        throw new Error("Watermark PNG not found. Expected backend/assets/watermark.png.");
      }

      console.log("3 - Convert HLS WATERMARK MODE");

      await withTimeout(
        new Promise((resolve, reject) => {
          const command = ffmpeg(tempVideo);
          const watermarkOptions = [
            "-filter_complex", buildPngWatermarkFilter(videoWidth, videoHeight),
            "-map [v]",
            "-map 0:a?",
          ];
          command.input(watermarkPngPath);

          command
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
              ...watermarkOptions,
              "-preset veryfast",
              "-crf 22",
              "-pix_fmt yuv420p",
              "-profile:v main",
              "-sc_threshold 0",
              "-g 48",
              "-keyint_min 48",
              "-force_key_frames expr:gte(t,n_forced*6)",
              "-max_muxing_queue_size 1024",
              "-start_number 0",
              "-hls_time 6",
              "-hls_list_size 0",
              "-hls_playlist_type vod",
              "-hls_flags independent_segments",
              `-hls_segment_filename ${path.join(outputDir, "seg_%03d.ts")}`,
              "-f hls",
            ])
            .output(masterPath)
            .on("start", (cmd) => {
              console.log("FFMPEG HLS WATERMARK CMD:", cmd);
            })
            .on("end", resolve)
            .on("error", reject)
            .run();
        }),
        1000 * 60 * 30,
        "HLS watermark convert"
      );
    } else if (canCopy) {
      console.log("3️⃣ Bắt đầu convert HLS COPY MODE");

      await withTimeout(
        new Promise((resolve, reject) => {
          ffmpeg(tempVideo)
            .outputOptions([
              "-c copy",
              "-bsf:v h264_mp4toannexb",
              "-avoid_negative_ts make_zero",
              "-start_number 0",
              "-hls_time 6",
              "-hls_list_size 0",
              "-hls_playlist_type vod",
              "-hls_flags independent_segments",
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
              "-crf 26",
              "-pix_fmt yuv420p",
              "-profile:v main",
              "-sc_threshold 0",
              "-g 48",
              "-keyint_min 48",
              "-force_key_frames expr:gte(t,n_forced*6)",
              "-max_muxing_queue_size 1024",
              "-hls_time 6",
              "-hls_list_size 0",
              "-hls_playlist_type vod",
              "-hls_flags independent_segments",
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

    const uploadFiles = files.filter((f) =>
      fs.statSync(path.join(outputDir, f)).isFile()
    );

    const BATCH = 6;
    for (let i = 0; i < uploadFiles.length; i += BATCH) {
      await Promise.all(
        uploadFiles.slice(i, i + BATCH).map((f) =>
          uploadFileToR2(
            `videos/${movieId}/hls/${f}`,
            fs.readFileSync(path.join(outputDir, f)),
            getContentType(f)
          )
        )
      );
    }

    console.log("6️⃣ Upload R2 xong");

    // =========================
    // SMART MEDIA GENERATION
    // =========================
    console.log("7️⃣ Generate preview + poster + backdrop");

    let previewResult = null;
    let backdropResult = null;

    previewDir = path.join(tmpDir, `${movieId}-preview`);
    ensureDir(previewDir);

    [previewResult, backdropResult] = await Promise.all([
      generatePreviewTimeline(tempVideo, previewDir, {
        movieId,
        previewWidth: 640,
        previewHeight: 360,
      }).then((r) => {
        console.log("✅ Preview generated:", r?.items?.length || 0, "items");
        return r;
      }).catch((err) => {
        console.warn("⚠️ Preview generation failed:", err.message);
        return null;
      }),
      generateVideoBackdrop(tempVideo, movieId, {
        candidateCount: 12,
        width: 1920,
        height: 1080,
      }).then((r) => {
        console.log("✅ Backdrop generated");
        return r;
      }).catch((err) => {
        console.warn("⚠️ Backdrop generation failed:", err.message);
        return null;
      }),
    ]);

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

router.get("/queue", protect, adminOnly, (req, res) => {
  return res.json({
    success: true,
    ...getQueueSnapshot(),
  });
});

// ==========================
// STATUS
// ==========================

router.get("/status/:movieId", protect, adminOnly, async (req, res) => {
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

router.post("/image", protect, adminOnly, async (req, res) => {
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

router.post("/video/:movieId", protect, adminOnly, async (req, res) => {
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
