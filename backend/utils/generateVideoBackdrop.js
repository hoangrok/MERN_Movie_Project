const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const sharp = require("sharp");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const {
  analyzeFrameCandidate,
  buildBackdropBuffer,
} = require("./posterGeneratorV2");

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function randomId(len = 16) {
  return crypto.randomBytes(len).toString("hex");
}

function sanitizeKeyPart(value = "movie") {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "movie"
  );
}

function getPublicUrl(key) {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!base) {
    throw new Error("Missing env: R2_PUBLIC_BASE_URL");
  }
  return `${base}/${key}`;
}

function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const duration = Number(metadata?.format?.duration || 0);
      if (!duration || Number.isNaN(duration)) {
        return reject(new Error("Cannot detect video duration"));
      }

      resolve(duration);
    });
  });
}

function buildCandidateTimestamps(duration, count = 12) {
  if (duration <= 6) {
    return [
      Math.max(0.4, Number((duration * 0.18).toFixed(2))),
      Math.max(0.8, Number((duration * 0.42).toFixed(2))),
      Math.max(1.2, Number((duration * 0.68).toFixed(2))),
    ];
  }

  const start = Math.max(1, duration * 0.1);
  const end = Math.max(start + 0.3, duration - Math.max(1.2, duration * 0.08));
  const step = (end - start) / Math.max(1, count - 1);

  const values = [];
  for (let i = 0; i < count; i++) {
    values.push(Number((start + step * i).toFixed(2)));
  }

  return Array.from(new Set(values));
}

function captureFrame(inputPath, outputPath, timeInSeconds) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(["-y"])
      .seekInput(timeInSeconds)
      .frames(1)
      .outputOptions(["-q:v 2", "-y"])
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

async function uploadBufferToR2(buffer, key, contentType = "image/jpeg") {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return getPublicUrl(key);
}

async function cleanupFiles(files = [], dirs = []) {
  for (const file of files) {
    try {
      await fsp.unlink(file);
    } catch (_) {}
  }

  for (const dir of dirs) {
    try {
      await fsp.rm(dir, { recursive: true, force: true });
    } catch (_) {}
  }
}

async function generateVideoBackdrop(videoPath, movieId = "movie", options = {}) {
  if (!videoPath) {
    throw new Error("Missing videoPath");
  }

  const safeMovieId = sanitizeKeyPart(movieId);
  const tempRoot = path.join(process.cwd(), "tmp", "backdrops");
  const jobId = `${safeMovieId}-${Date.now()}-${randomId(6)}`;
  const jobDir = path.join(tempRoot, jobId);

  ensureDir(jobDir);

  const tempFiles = [];
  const genres = Array.isArray(options.genres) ? options.genres : [];

  try {
    const duration = await getVideoDuration(videoPath);
    const timestamps = buildCandidateTimestamps(
      duration,
      Number(options.candidateCount) || 12
    );

    const candidates = [];

    for (let i = 0; i < timestamps.length; i++) {
      const second = timestamps[i];
      const framePath = path.join(jobDir, `frame-${i + 1}.jpg`);
      tempFiles.push(framePath);

      try {
        await captureFrame(videoPath, framePath, second);

        if (!fs.existsSync(framePath)) continue;

        const stat = fs.statSync(framePath);
        if (!stat.size || stat.size < 1200) continue;

        const metrics = await analyzeFrameCandidate(framePath, { genres });
        candidates.push({
          second,
          path: framePath,
          ...metrics,
        });
      } catch (err) {
        console.warn(`capture frame failed at ${second}s:`, err.message);
      }
    }

    if (candidates.length < 1) {
      throw new Error("No usable frames found in video");
    }

    // Pick single best frame by quality score
    candidates.sort((a, b) => b.backdropScore - a.backdropScore);
    const best = candidates[0];

    const finalBuffer = await buildBackdropBuffer(best.path, {
      width: Number(options.width) || 1280,
      height: Number(options.height) || 720,
      genres,
      analysis: best,
    });

    const r2Key = `backdrops/${safeMovieId}/${Date.now()}-${randomId(6)}.jpg`;
    const backdropUrl = await uploadBufferToR2(finalBuffer, r2Key, "image/jpeg");

    await cleanupFiles(tempFiles, [jobDir]);

    return {
      backdropUrl,
      r2Key,
      duration: Number(duration.toFixed(2)),
      capturedAt: [best.second],
      bestFrames: candidates.slice(0, 3).map((x) => ({
        second: x.second,
        score: Number(x.backdropScore.toFixed(2)),
        frameScore: Number(x.frameScore.toFixed(2)),
        avgBrightness: Number(x.avgBrightness.toFixed(2)),
        contrast: Number(x.contrast.toFixed(2)),
        avgSaturation: Number(x.avgSaturation.toFixed(4)),
        edgeScore: Number(x.edgeScore.toFixed(2)),
        subjectX: Number(x.subjectX.toFixed(4)),
        subjectY: Number(x.subjectY.toFixed(4)),
        skinRatio: Number(x.skinRatio.toFixed(4)),
        colorStory: x.colorStory,
      })),
    };
  } catch (error) {
    await cleanupFiles(tempFiles, [jobDir]);
    throw error;
  }
}

module.exports = {
  generateVideoBackdrop,
};
