const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const {
  analyzeFrameCandidate,
  buildPosterBuffer,
} = require("./posterGeneratorV2");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function randomId(len = 8) {
  return crypto.randomBytes(len).toString("hex");
}

function sanitizeKeyPart(value = "movie") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "movie";
}

function getPublicUrl(key) {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("Missing env: R2_PUBLIC_BASE_URL");
  return `${base}/${key}`;
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

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) return reject(err);
      const duration = Number(data?.format?.duration || 0);
      if (!duration || Number.isNaN(duration)) {
        return reject(new Error("Cannot detect video duration"));
      }
      resolve(duration);
    });
  });
}

function takeScreenshot(videoPath, outputPath, timestampSec, size = "960x?") {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(videoPath)
      .seekInput(Math.max(0, Number(timestampSec) || 0))
      .frames(1)
      .outputOptions(["-q:v 2", "-y"])
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject);

    if (size) {
      command.size(size);
    }

    command.run();
  });
}

function buildCandidateTimestamps(duration, candidateCount = 18) {
  if (duration <= 3) return [0.4, 1, Math.max(1.4, duration * 0.8)];

  const start = Math.max(0.8, Math.min(3, duration * 0.06));
  const end = Math.max(start + 0.2, duration - Math.max(0.8, duration * 0.06));
  const step = (end - start) / Math.max(1, candidateCount - 1);

  const values = [];
  for (let i = 0; i < candidateCount; i++) {
    values.push(Number((start + step * i).toFixed(2)));
  }

  return Array.from(new Set(values));
}

function getAutoPreviewCount(duration) {
  if (duration >= 1800) return 24;
  if (duration >= 900) return 20;
  if (duration >= 300) return 16;
  return 10;
}

async function buildJpegBuffer(filePath, width, height, quality = 84, fit = "cover") {
  return sharp(filePath)
    .resize(width, height, {
      fit,
      position: "centre",
      background: { r: 5, g: 7, b: 12, alpha: 1 },
      withoutEnlargement: false,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

module.exports = async function generatePreviewTimeline(
  videoPath,
  outputDir,
  options = {}
) {
  const requestedPreviewCount = Number(options.previewCount) || 0;
  const requestedCandidateCount = Number(options.candidateCount) || 0;
  const prefix = options.prefix || "preview";
  const movieId = sanitizeKeyPart(options.movieId || "movie");
  const previewWidth = Number(options.previewWidth) || 960;
  const previewHeight = Number(options.previewHeight) || 540;
  const posterWidth = Number(options.posterWidth) || 900;
  const posterHeight = Number(options.posterHeight) || 1350;
  const genres = Array.isArray(options.genres) ? options.genres : [];

  const tempFiles = [];

  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      console.warn("generatePreviewTimeline: missing videoPath", videoPath);
      return {
        duration: 0,
        interval: 0,
        items: [],
        posterUrl: "",
        posterKey: "",
        bestFrame: null,
      };
    }

    if (!outputDir) {
      console.warn("generatePreviewTimeline: missing outputDir");
      return {
        duration: 0,
        interval: 0,
        items: [],
        posterUrl: "",
        posterKey: "",
        bestFrame: null,
      };
    }

    ensureDir(outputDir);

    const duration = await getVideoDuration(videoPath);
    const previewCount = requestedPreviewCount || getAutoPreviewCount(duration);
    const candidateCount =
      requestedCandidateCount || Math.max(24, previewCount * 2);
    const timestamps = buildCandidateTimestamps(duration, candidateCount);

    const candidates = [];

    for (let i = 0; i < timestamps.length; i++) {
      const second = timestamps[i];
      const fileName = `${prefix}_candidate_${i + 1}.jpg`;
      const filePath = path.join(outputDir, fileName);
      tempFiles.push(filePath);

      try {
        await takeScreenshot(videoPath, filePath, second);

        if (!fs.existsSync(filePath)) continue;

        const stat = fs.statSync(filePath);
        if (!stat.size || stat.size < 1200) {
          try {
            fs.rmSync(filePath, { force: true });
          } catch (_) {}
          continue;
        }

        const metrics = await analyzeFrameCandidate(filePath, { genres });

        candidates.push({
          second,
          fileName,
          path: filePath,
          ...metrics,
        });
      } catch (err) {
        console.warn(
          `generatePreviewTimeline: screenshot failed at ${second}s:`,
          err.message
        );
      }
    }

    if (!candidates.length) {
      return {
        duration: Number(duration.toFixed(2)),
        interval: 0,
        items: [],
        posterUrl: "",
        posterKey: "",
        bestFrame: null,
      };
    }

    candidates.sort((a, b) => b.posterScore - a.posterScore);

    const bestFrame = candidates[0];
    const sortedByTime = [...candidates].sort((a, b) => a.second - b.second);

    const chosen = [];
    const minGap = Math.max(3, duration / Math.max(6, previewCount + 1));

    for (const frame of sortedByTime) {
      if (chosen.length >= previewCount) break;

      const isFarEnough = chosen.every(
        (picked) => Math.abs(picked.second - frame.second) >= minGap
      );

      if (isFarEnough) {
        chosen.push(frame);
      }
    }

    if (chosen.length < Math.min(previewCount, sortedByTime.length)) {
      for (const frame of sortedByTime) {
        if (chosen.length >= previewCount) break;
        if (!chosen.find((x) => x.path === frame.path)) {
          chosen.push(frame);
        }
      }
    }

    chosen.sort((a, b) => a.second - b.second);

    const previewItems = [];
    for (let i = 0; i < chosen.length; i++) {
      const frame = chosen[i];
      const previewBuffer = await buildJpegBuffer(
        frame.path,
        previewWidth,
        previewHeight,
        92,
        "contain"
      );

      const key = `previews/${movieId}/${Date.now()}-${i + 1}-${randomId(4)}.jpg`;
      const url = await uploadBufferToR2(previewBuffer, key, "image/jpeg");

        previewItems.push({
        second: frame.second,
        url,
        key,
        score: frame.frameScore,
      });
    }

    const posterBuffer = await buildPosterBuffer(bestFrame.path, {
      width: posterWidth,
      height: posterHeight,
      genres,
      analysis: bestFrame,
    });
    const posterKey = `posters/${movieId}/${Date.now()}-${randomId(6)}.jpg`;
    const posterUrl = await uploadBufferToR2(posterBuffer, posterKey, "image/jpeg");

    await cleanupFiles(tempFiles, []);

    return {
      duration: Number(duration.toFixed(2)),
      interval:
        previewItems.length > 1
          ? Number(
              (
                (previewItems[previewItems.length - 1].second -
                  previewItems[0].second) /
                (previewItems.length - 1)
              ).toFixed(2)
            )
          : 0,
      items: previewItems,
      posterUrl,
      posterKey,
      bestFrame: {
        second: bestFrame.second,
        score: bestFrame.posterScore,
        frameScore: bestFrame.frameScore,
        avgBrightness: bestFrame.avgBrightness,
        contrast: bestFrame.contrast,
        avgSaturation: bestFrame.avgSaturation,
        edgeScore: bestFrame.edgeScore,
        subjectX: bestFrame.subjectX,
        subjectY: bestFrame.subjectY,
        skinRatio: bestFrame.skinRatio,
        colorStory: bestFrame.colorStory,
      },
      candidates: candidates
        .slice(0, 8)
        .map(({ second, posterScore, frameScore, avgBrightness, contrast, avgSaturation, edgeScore, subjectX, subjectY, skinRatio, colorStory }) => ({
          second,
          score: posterScore,
          frameScore,
          avgBrightness,
          contrast,
          avgSaturation,
          edgeScore,
          subjectX,
          subjectY,
          skinRatio,
          colorStory,
        })),
    };
  } catch (err) {
    console.warn("generatePreviewTimeline fatal fallback:", err.message);

    await cleanupFiles(tempFiles, []);

    return {
      duration: 0,
      interval: 0,
      items: [],
      posterUrl: "",
      posterKey: "",
      bestFrame: null,
    };
  }
};
