const crypto = require("crypto");
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

const createSlug = (text = "") => {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const buildSegmentTitle = (movie, episodeNumber, totalSegments) => {
  const seriesBaseTitle = String(movie?.seriesTitle || movie?.title || "merged-video").trim();
  if (totalSegments <= 1) return seriesBaseTitle;
  return `${seriesBaseTitle} - Tap ${episodeNumber}`;
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

const { buildWatermarkFilter } = require("../utils/watermark");
const {
  mergeVideos,
  getVideoInfo,
  groupVideosByDuration,
  sortVideos,
  findVideoFiles,
  cleanOldTmpFiles,
} = require("../utils/mergeVideoSegments");

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

async function processVideoInBackground({ movieId, tempVideo, isBatchUpload = false }) {
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

    const copyModeStatus = watermarkEnabled
      ? "disabled (watermark burn-in is enabled)"
      : canCopy
        ? "enabled"
        : "disabled (source codecs are not copy-safe)";

    console.log("stream copy optimization:", copyModeStatus);
    console.log("watermark burn-in:", watermarkEnabled);
    console.log("video dimensions:", `${videoWidth}x${videoHeight}`);
    console.log("preview profile:", isBatchUpload ? "batch-lite" : "full");

    movie.videoWidth = Number(videoWidth) || 0;
    movie.videoHeight = Number(videoHeight) || 0;

    const masterPath = path.join(outputDir, "master.m3u8");

    if (watermarkEnabled) {
      console.log("3 - Convert HLS WATERMARK MODE");

      const { filterComplex, logoPath } = buildWatermarkFilter(videoWidth, videoHeight);
      console.log("watermark filter:", logoPath ? `text+logo (${logoPath})` : "text-only");

      await withTimeout(
        new Promise((resolve, reject) => {
          const command = ffmpeg(tempVideo);

          if (logoPath) command.input(logoPath);

          command
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
              "-filter_complex", filterComplex,
              "-map [v]",
              "-map 0:a?",
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
        previewWidth: isBatchUpload ? 480 : 640,
        previewHeight: isBatchUpload ? 270 : 360,
        previewCount: isBatchUpload ? 3 : undefined,
        candidateCount: isBatchUpload ? 8 : undefined,
      }).then((r) => {
        console.log("✅ Preview generated:", r?.items?.length || 0, "items");
        return r;
      }).catch((err) => {
        console.warn("⚠️ Preview generation failed:", err.message);
        return null;
      }),
      generateVideoBackdrop(tempVideo, movieId, {
        candidateCount: isBatchUpload ? 6 : 12,
        width: isBatchUpload ? 1280 : 1920,
        height: isBatchUpload ? 720 : 1080,
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
      "_id title status hlsUrl poster backdrop previewTimeline processingError thumbnailPickedAt updatedAt"
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

    const imageBody = file.tempFilePath
      ? fs.readFileSync(file.tempFilePath)
      : file.data;
    await uploadFileToR2(key, imageBody, getContentType(fileName));

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
// UPLOAD MOVIE GALLERY IMAGES
// ==========================

router.post("/movie-images/:movieId", protect, adminOnly, async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ success: false, message: "movieId không hợp lệ" });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ success: false, message: "Không tìm thấy movie" });
    }

    const files = req.files;
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ success: false, message: "Không có ảnh nào được gửi" });
    }

    const publicBase = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    const uploadedUrls = [];

    const fileList = Array.isArray(files.images)
      ? files.images
      : files.images
        ? [files.images]
        : Object.values(files).flat();

    const MAX_IMAGES = 30;
    const toUpload = fileList.slice(0, MAX_IMAGES);

    for (const file of toUpload) {
      const ext = path.extname(file.name || "image.jpg").toLowerCase() || ".jpg";
      const key = `videos/${movieId}/gallery/${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
      const galleryBody = file.tempFilePath
        ? fs.readFileSync(file.tempFilePath)
        : file.data;
      await uploadFileToR2(key, galleryBody, getContentType(key));
      uploadedUrls.push(`${publicBase}/${key}`);
    }

    if (!movie.images) movie.images = [];
    movie.images.push(...uploadedUrls);
    await movie.save();

    return res.json({ success: true, images: movie.images, added: uploadedUrls.length });
  } catch (err) {
    console.error("upload movie-images error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/movie-images/:movieId", protect, adminOnly, async (req, res) => {
  try {
    const { movieId } = req.params;
    const { url } = req.body;

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ success: false, message: "movieId không hợp lệ" });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ success: false, message: "Không tìm thấy movie" });

    movie.images = (movie.images || []).filter((img) => img !== url);
    await movie.save();

    return res.json({ success: true, images: movie.images });
  } catch (err) {
    console.error("delete movie-image error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================
// UPLOAD MULTIPLE VIDEOS (AUTO MERGE)
// ==========================

router.post("/videos/:movieId", protect, adminOnly, async (req, res) => {
  let tempVideos = [];
  let mergedVideo = null;
  let mergedArtifacts = [];
  let uploadDir = null;

  try {
    const { movieId } = req.params;
    const files = req.files?.videos;
    const targetDuration = parseInt(req.query.targetDuration) || 900; // 15 phút mặc định
    const sortBy = req.query.sortBy || 'name'; // 'name' hoặc 'time'

    console.log("========== MULTIPLE VIDEO UPLOAD REQUEST ==========");
    console.log("movieId:", movieId);
    console.log("files count:", Array.isArray(files) ? files.length : 1);
    console.log("targetDuration:", targetDuration, "seconds");
    console.log("sortBy:", sortBy);

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

    if (!files) {
      return res.status(400).json({
        success: false,
        message: "No videos uploaded",
      });
    }

    const videoFiles = Array.isArray(files) ? files : [files];
    
    if (videoFiles.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Cần ít nhất 2 video để ghép. Nếu chỉ có 1 video, dùng endpoint /video/:movieId",
      });
    }

    console.log(`1️⃣ Nhận ${videoFiles.length} video files`);

    const tmpDir = path.join(__dirname, "../tmp");
    ensureDir(tmpDir);
    uploadDir = path.join(tmpDir, `${movieId}-uploads`);
    ensureDir(uploadDir);

    // Lưu tất cả video vào thư mục tạm
    for (const file of videoFiles) {
      const ext = path.extname(file.name || "video.mp4").toLowerCase() || ".mp4";
      const baseName = path.parse(file.name || "video").name;
      const safeBaseName = cleanFileBaseName(baseName);
      const safeLocalName = `${Date.now()}-${safeBaseName || "video"}${ext}`;
      const videoPath = path.join(uploadDir, safeLocalName);
      
      await file.mv(videoPath);
      tempVideos.push(videoPath);
      console.log(`   ✅ Saved: ${videoPath}`);
    }

    console.log(`2️⃣ Đã lưu ${tempVideos.length} videos vào thư mục tạm`);

    // Sắp xếp video theo thứ tự
    tempVideos = sortVideos(tempVideos, sortBy);
    console.log(`3️⃣ Đã sắp xếp videos theo: ${sortBy}`);

    // Lấy thông tin video (duration) để phân nhóm
    const videosWithInfo = await Promise.all(
      tempVideos.map(async (videoPath) => {
        try {
          const info = await getVideoInfo(videoPath);
          console.log(`   📹 ${path.basename(videoPath)}: ${info.duration}s, ${info.width}x${info.height}`);
          return { path: videoPath, duration: info.duration, info };
        } catch (err) {
          console.warn(`   ⚠️ Failed to get info for ${path.basename(videoPath)}:`, err.message);
          return { path: videoPath, duration: 0, info: null };
        }
      })
    );

    // Phân nhóm các video thành các segment có thời lượng xấp xỉ targetDuration
    const videoGroups = groupVideosByDuration(videosWithInfo, targetDuration);
    console.log(`4️⃣ Đã phân nhóm thành ${videoGroups.length} segments:`);
    videoGroups.forEach((group, i) => {
      console.log(`   Segment ${i + 1}: ${group.length} videos`);
    });

    const baseEpisode = Math.max(Number(movie.episode) || 1, 1);
    const segmentMovies = [];
    const totalSegments = videoGroups.length;

    movie.status = "queued";
    movie.processingError = "";
    movie.episode = baseEpisode;
    if (totalSegments > 1) {
      movie.title = buildSegmentTitle(movie, baseEpisode, totalSegments);
      movie.episodeLabel = movie.episodeLabel || `Tap ${baseEpisode}`;
    }
    await movie.save();
    segmentMovies.push(movie);

    for (let i = 1; i < totalSegments; i++) {
      const episodeNumber = baseEpisode + i;
      const title = buildSegmentTitle(movie, episodeNumber, totalSegments);
      const segmentPayload = {
        title,
        slug: `${createSlug(title) || "merged-video"}-${Date.now()}-${episodeNumber}`,
        description: movie.description || "",
        poster: movie.poster || "",
        backdrop: movie.backdrop || "",
        genre: Array.isArray(movie.genre) ? [...movie.genre] : [],
        year: movie.year || null,
        rating: movie.rating || 0,
        duration: 0,
        hlsUrl: "",
        trailerUrl: movie.trailerUrl || "",
        type: movie.type || "movie",
        contentArea: movie.contentArea || "default",
        isPublished: movie.isPublished !== false,
        featured: false,
        newPopular: false,
        cast: Array.isArray(movie.cast) ? [...movie.cast] : [],
        director: movie.director || "",
        language: movie.language || "English",
        country: movie.country || "",
        subtitles: Array.isArray(movie.subtitles) ? [...movie.subtitles] : [],
        status: "queued",
        processingError: "",
        thumbnailPickedAt: null,
        images: Array.isArray(movie.images) ? [...movie.images] : [],
        seriesId: movie.seriesId || "",
        seriesTitle: movie.seriesTitle || "",
        season: movie.season || 1,
        episode: episodeNumber,
        episodeLabel: `Tap ${episodeNumber}`,
        episodeTitle: "",
      };

      const segmentMovie = await Movie.create(segmentPayload);
      segmentMovies.push(segmentMovie);
    }

    addJob(async () => {
      console.log("========== VIDEO MERGE & PROCESS START ==========");
      cleanOldTmpFiles(tmpDir, 6);

      for (let i = 0; i < videoGroups.length; i++) {
        const group = videoGroups[i];
        const segmentMovie = segmentMovies[i];
        let segmentMergedPath = null;

        try {
          segmentMergedPath = path.join(tmpDir, `${segmentMovie._id}-merged-${i}.mp4`);
          mergedArtifacts.push(segmentMergedPath);

          console.log(
            `[SEGMENT ${i + 1}/${videoGroups.length}] Movie ${segmentMovie._id} - merge ${group.length} videos`
          );

          const mergeResult = await mergeVideos(group, segmentMergedPath, {
            copyMode: true,
          });

          console.log(`[SEGMENT ${i + 1}] Merge done: ${mergeResult.duration}s`);

          await processVideoInBackground({
            movieId: segmentMovie._id,
            tempVideo: segmentMergedPath,
            isBatchUpload: true,
          });
        } catch (err) {
          console.error(`[SEGMENT ${i + 1}] MERGE & PROCESS ERROR:`, err);
          try {
            const failedMovie = await Movie.findById(segmentMovie._id);
            if (failedMovie) {
              failedMovie.status = "failed";
              failedMovie.processingError =
                err.message || "Video merge and processing failed";
              await failedMovie.save();
            }
          } catch (saveErr) {
            console.error("Save failed status error:", saveErr);
          }
        } finally {
          cleanup(...group, segmentMergedPath);
        }
      }

      cleanup(uploadDir, ...mergedArtifacts, mergedVideo);
      console.log("========== VIDEO MERGE & PROCESS DONE ==========");
    });

    return res.json({
      success: true,
      queued: true,
      movieId,
      status: "queued",
      message: `Da nhan ${videoFiles.length} videos. Dang ghep thanh ${videoGroups.length} tap va xu ly nen.`,
      mergeInfo: {
        totalVideos: videoFiles.length,
        segments: videoGroups.length,
        targetDuration,
      },
      segments: videoGroups.map((group, index) => ({
        movieId: String(segmentMovies[index]._id),
        episode: segmentMovies[index].episode || baseEpisode + index,
        clipCount: group.length,
        title: segmentMovies[index].title,
      })),
    });
  } catch (err) {
    console.error("upload multiple videos enqueue error:", err);
    cleanup(uploadDir, ...tempVideos, ...mergedArtifacts, mergedVideo);

    return res.status(500).json({
      success: false,
      message: err.message || "Upload multiple videos failed",
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
    const isBatchUpload =
      req.query.batch === "1" ||
      String(req.headers["x-upload-mode"] || "").toLowerCase() === "batch";

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
        isBatchUpload,
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
