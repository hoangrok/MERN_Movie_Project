const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const sharp = require("sharp");
const mongoose = require("mongoose");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const r2 = require("../utils/r2");
const Movie = require("../models/Movie");
const generatePreviewTimeline = require("../utils/generatePreviewTimeline");
const { addJob, getQueueSnapshot } = require("../utils/videoJobQueue");

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

const takeScreenshot = (videoPath, outputPath, timestampSec, size) =>
  new Promise((resolve, reject) => {
    ensureDir(path.dirname(outputPath));

    ffmpeg(videoPath)
      .seekInput(Math.max(0, timestampSec))
      .frames(1)
      .outputOptions(["-q:v 2"])
      .size(size)
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const uniqueNumbers = (arr) => {
  const seen = new Set();
  return arr.filter((n) => {
    const key = Number(n).toFixed(2);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getCandidateTimestamps = (duration) => {
  if (!Number.isFinite(duration) || duration <= 0) {
    return [3, 6, 10];
  }

  const startSafe = Math.min(12, duration * 0.08);
  const endSafe = Math.max(duration - 12, duration * 0.88);

  const points = [
    duration * 0.1,
    duration * 0.18,
    duration * 0.28,
    duration * 0.38,
    duration * 0.5,
    duration * 0.62,
    duration * 0.72,
    duration * 0.82,
  ]
    .map((t) => clamp(t, startSafe, endSafe))
    .filter((t) => t > 1 && t < duration - 1);

  return uniqueNumbers(points);
};

const scoreImageBuffer = async (buffer) => {
  const image = sharp(buffer);
  const meta = await image.metadata();

  if (!meta.width || !meta.height) {
    return { score: -999999 };
  }

  const { data, info } = await image
    .resize(320, 180, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixelCount = info.width * info.height;

  let sumLuma = 0;
  let sumSqLuma = 0;
  let colorSpread = 0;
  let darkPixels = 0;
  let brightPixels = 0;
  let centerScore = 0;
  let edgeEnergy = 0;

  const getIndex = (x, y) => (y * info.width + x) * channels;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = getIndex(x, y);
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sumLuma += luma;
      sumSqLuma += luma * luma;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      colorSpread += maxC - minC;

      if (luma < 28) darkPixels++;
      if (luma > 235) brightPixels++;

      const nx = (x / info.width - 0.5) * 2;
      const ny = (y / info.height - 0.5) * 2;
      const dist = Math.sqrt(nx * nx + ny * ny);
      const centerWeight = Math.max(0, 1 - dist);
      centerScore += luma * centerWeight;
    }
  }

  for (let y = 0; y < info.height - 1; y++) {
    for (let x = 0; x < info.width - 1; x++) {
      const i = getIndex(x, y);
      const ir = getIndex(x + 1, y);
      const id = getIndex(x, y + 1);

      const l1 =
        0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const l2 =
        0.2126 * data[ir] + 0.7152 * data[ir + 1] + 0.0722 * data[ir + 2];
      const l3 =
        0.2126 * data[id] + 0.7152 * data[id + 1] + 0.0722 * data[id + 2];

      edgeEnergy += Math.abs(l1 - l2) + Math.abs(l1 - l3);
    }
  }

  const mean = sumLuma / pixelCount;
  const variance = sumSqLuma / pixelCount - mean * mean;
  const stdDev = Math.sqrt(Math.max(variance, 0));
  const saturationMean = colorSpread / pixelCount;
  const darkRatio = darkPixels / pixelCount;
  const brightRatio = brightPixels / pixelCount;
  const centerMean = centerScore / pixelCount;
  const edgeMean = edgeEnergy / pixelCount;

  let score = 0;
  score += stdDev * 1.8;
  score += saturationMean * 0.9;
  score += edgeMean * 2.2;
  score += centerMean * 0.18;

  if (mean < 45) score -= 120;
  else if (mean < 70) score -= 45;
  else if (mean > 220) score -= 80;

  if (darkRatio > 0.65) score -= 140;
  else if (darkRatio > 0.45) score -= 50;

  if (brightRatio > 0.55) score -= 80;

  return { score };
};

const buildPosterAndBackdrop = async (sourcePath, posterOut, backdropOut) => {
  const source = sharp(sourcePath);
  const meta = await source.metadata();

  if (!meta.width || !meta.height) {
    throw new Error("Không đọc được kích thước ảnh nguồn");
  }

  await source
    .clone()
    .resize(400, 600, {
      fit: "cover",
      position: "attention",
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(posterOut);

  await source
    .clone()
    .resize(1280, 720, {
      fit: "cover",
      position: "attention",
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(backdropOut);
};

const generateSmartThumbnails = async (videoPath, tmpDir, movieId) => {
  const probe = await ffprobeAsync(videoPath);
  const duration = Number(probe?.format?.duration || 0);

  const candidatesDir = path.join(tmpDir, `${movieId}-candidates`);
  const thumbsDir = path.join(tmpDir, `${movieId}-thumbs`);

  ensureDir(candidatesDir);
  ensureDir(thumbsDir);

  const timestamps = getCandidateTimestamps(duration);
  if (!timestamps.length) {
    throw new Error("Không lấy được mốc thời gian để tạo thumbnail");
  }

  const scored = [];

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const candidatePath = path.join(candidatesDir, `candidate-${i + 1}.jpg`);

    try {
      await takeScreenshot(videoPath, candidatePath, t, "1280x720");
      const buffer = fs.readFileSync(candidatePath);
      const result = await scoreImageBuffer(buffer);

      scored.push({
        path: candidatePath,
        timestamp: t,
        score: result.score,
      });
    } catch (err) {
      console.error(`thumbnail candidate error at ${t}s:`, err.message);
    }
  }

  if (!scored.length) {
    throw new Error("Không tạo được candidate thumbnail nào");
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  const posterPath = path.join(thumbsDir, "poster.jpg");
  const backdropPath = path.join(thumbsDir, "backdrop.jpg");

  await buildPosterAndBackdrop(best.path, posterPath, backdropPath);

  for (const item of scored) {
    if (fs.existsSync(item.path)) fs.unlinkSync(item.path);
  }

  if (fs.existsSync(candidatesDir)) {
    fs.rmSync(candidatesDir, { recursive: true, force: true });
  }

  return {
    posterPath,
    backdropPath,
    pickedAt: best.timestamp,
    score: best.score,
  };
};

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

async function processVideoInBackground({ movieId, tempVideo }) {
  let outputDir = null;
  let thumbsDir = null;
  let timelineDir = null;

  try {
    console.log("========== VIDEO BACKGROUND START ==========");
    console.log("movieId:", movieId);

    const movie = await Movie.findById(movieId);
    if (!movie) throw new Error("Movie not found");

    movie.status = "processing";
    movie.processingError = "";
    await movie.save();

    const sourceVideoForProcessing = tempVideo;
    const tmpDir = path.join(__dirname, "../tmp");
    ensureDir(tmpDir);

    outputDir = path.join(tmpDir, `${movieId}-hls`);
    const variantDir = path.join(outputDir, "v0");

    ensureDir(outputDir);
    ensureDir(variantDir);

    console.log("3️⃣ Bắt đầu convert HLS");

    await withTimeout(
      new Promise((resolve, reject) => {
        ffmpeg(sourceVideoForProcessing)
          .videoCodec("libx264")
          .audioCodec("aac")
          .outputOptions([
            "-preset ultrafast",
            "-crf 30",
            "-tune zerolatency",
            "-threads 1",
            "-hls_time 10",
            "-hls_playlist_type vod",
            "-hls_list_size 0",
            "-vf scale=854:-2",
            `-hls_segment_filename ${path.join(variantDir, "seg_%03d.ts")}`,
          ])
          .output(path.join(variantDir, "index.m3u8"))
          .on("start", (cmd) => {
            console.log("FFMPEG HLS CMD:", cmd);
          })
          .on("end", resolve)
          .on("error", reject)
          .run();
      }),
      1000 * 60 * 20,
      "HLS convert"
    );

    console.log("4️⃣ Convert xong");

    const publicBase = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    let pickedInfo = null;

    if (!movie.poster || !movie.backdrop) {
      console.log("4.1️⃣ Generating smart thumbnails...");
      const thumbResult = await withTimeout(
        generateSmartThumbnails(sourceVideoForProcessing, tmpDir, movieId),
        1000 * 60 * 5,
        "Thumbnail generation"
      );

      pickedInfo = thumbResult;
      thumbsDir = path.dirname(thumbResult.posterPath);

      if (!movie.poster && fs.existsSync(thumbResult.posterPath)) {
        const posterKey = `videos/${movieId}/poster.jpg`;
        await uploadFileToR2(
          posterKey,
          fs.readFileSync(thumbResult.posterPath),
          "image/jpeg"
        );
        movie.poster = `${publicBase}/${posterKey}`;
      }

      if (!movie.backdrop && fs.existsSync(thumbResult.backdropPath)) {
        const backdropKey = `videos/${movieId}/backdrop.jpg`;
        await uploadFileToR2(
          backdropKey,
          fs.readFileSync(thumbResult.backdropPath),
          "image/jpeg"
        );
        movie.backdrop = `${publicBase}/${backdropKey}`;
      }
    }

    console.log("4.2️⃣ Generating preview timeline...");
    timelineDir = path.join(tmpDir, `${movieId}-timeline`);
    ensureDir(timelineDir);

    const timelineResult = await withTimeout(
      generatePreviewTimeline(sourceVideoForProcessing, timelineDir, {
        interval: 10,
        prefix: "preview",
      }),
      1000 * 60 * 5,
      "Preview timeline generation"
    );

    const timelineItems = [];

    for (const item of timelineResult.items || []) {
      const fileExists = !!item?.path && fs.existsSync(item.path);
      if (!fileExists) continue;

      const buffer = fs.readFileSync(item.path);
      if (!buffer || buffer.length < 1000) continue;

      const key = `videos/${movieId}/timeline/${item.fileName}`;
      await uploadFileToR2(key, buffer, "image/jpeg");

      timelineItems.push({
        second: item.second,
        url: `${publicBase}/${key}`,
      });
    }

    movie.previewTimeline = {
      duration: timelineResult?.duration || 0,
      interval: timelineResult?.interval || 10,
      items: timelineItems,
    };

    const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
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
    movie.hlsUrl = streamBase
      ? `${streamBase}/videos/${movieId}/hls/master.m3u8`
      : `/videos/${movieId}/hls/master.m3u8`;

    movie.status = "ready";
    movie.processingError = "";
    if (pickedInfo?.pickedAt) movie.thumbnailPickedAt = pickedInfo.pickedAt;

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
    cleanup(tempVideo, outputDir, thumbsDir, timelineDir);
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
      "_id title status hlsUrl poster backdrop previewTimeline processingError"
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