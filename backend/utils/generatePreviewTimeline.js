const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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

function takeScreenshot(videoPath, outputPath, timestampSec, size = "640x360") {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(Math.max(0, Number(timestampSec) || 0))
      .frames(1)
      .outputOptions(["-q:v 2", "-y"])
      .size(size)
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
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

async function analyzeFrame(filePath) {
  const image = sharp(filePath);
  const { data, info } = await image
    .clone()
    .resize(96, 54, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  let brightnessSum = 0;
  let brightnessSqSum = 0;
  let edgeScore = 0;
  let saturationSum = 0;

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    saturationSum += sat;

    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    brightnessSum += y;
    brightnessSqSum += y * y;
  }

  for (let y = 0; y < info.height - 1; y++) {
    for (let x = 0; x < info.width - 1; x++) {
      const idx = (y * info.width + x) * 3;
      const idxRight = (y * info.width + (x + 1)) * 3;
      const idxBottom = ((y + 1) * info.width + x) * 3;

      const l1 = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const l2 =
        0.299 * data[idxRight] +
        0.587 * data[idxRight + 1] +
        0.114 * data[idxRight + 2];
      const l3 =
        0.299 * data[idxBottom] +
        0.587 * data[idxBottom + 1] +
        0.114 * data[idxBottom + 2];

      edgeScore += Math.abs(l1 - l2) + Math.abs(l1 - l3);
    }
  }

  const avgBrightness = brightnessSum / totalPixels;
  const variance = brightnessSqSum / totalPixels - avgBrightness * avgBrightness;
  const contrast = Math.sqrt(Math.max(0, variance));
  const avgSaturation = saturationSum / totalPixels;
  const normalizedEdge = edgeScore / totalPixels;

  let score = 0;

  if (avgBrightness >= 45 && avgBrightness <= 205) score += 25;
  else if (avgBrightness >= 28 && avgBrightness <= 225) score += 12;
  else score -= 18;

  if (contrast >= 22) score += 25;
  else if (contrast >= 14) score += 14;
  else score -= 15;

  if (avgSaturation >= 0.14) score += 18;
  else if (avgSaturation >= 0.08) score += 8;
  else score -= 8;

  if (normalizedEdge >= 18) score += 24;
  else if (normalizedEdge >= 12) score += 14;
  else if (normalizedEdge >= 8) score += 6;
  else score -= 12;

  if (avgBrightness < 20 || avgBrightness > 235) score -= 25;
  if (contrast < 8) score -= 20;

  return {
    score,
    avgBrightness: Number(avgBrightness.toFixed(2)),
    contrast: Number(contrast.toFixed(2)),
    avgSaturation: Number(avgSaturation.toFixed(4)),
    edgeScore: Number(normalizedEdge.toFixed(2)),
  };
}

async function buildJpegBuffer(filePath, width, height, quality = 84) {
  return sharp(filePath)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
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
  const previewCount = Number(options.previewCount) || 8;
  const candidateCount = Number(options.candidateCount) || 18;
  const prefix = options.prefix || "preview";
  const movieId = sanitizeKeyPart(options.movieId || "movie");
  const previewWidth = Number(options.previewWidth) || 320;
  const previewHeight = Number(options.previewHeight) || 180;
  const posterWidth = Number(options.posterWidth) || 900;
  const posterHeight = Number(options.posterHeight) || 1350;

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
    const timestamps = buildCandidateTimestamps(duration, candidateCount);

    const candidates = [];

    for (let i = 0; i < timestamps.length; i++) {
      const second = timestamps[i];
      const fileName = `${prefix}_candidate_${i + 1}.jpg`;
      const filePath = path.join(outputDir, fileName);
      tempFiles.push(filePath);

      try {
        await takeScreenshot(videoPath, filePath, second, "640x360");

        if (!fs.existsSync(filePath)) continue;

        const stat = fs.statSync(filePath);
        if (!stat.size || stat.size < 1200) {
          try {
            fs.rmSync(filePath, { force: true });
          } catch (_) {}
          continue;
        }

        const metrics = await analyzeFrame(filePath);

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

    candidates.sort((a, b) => b.score - a.score);

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
        82
      );

      const key = `previews/${movieId}/${Date.now()}-${i + 1}-${randomId(4)}.jpg`;
      const url = await uploadBufferToR2(previewBuffer, key, "image/jpeg");

      previewItems.push({
        second: frame.second,
        url,
        key,
        score: frame.score,
      });
    }

    const posterBuffer = await buildJpegBuffer(
      bestFrame.path,
      posterWidth,
      posterHeight,
      86
    );
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
        score: bestFrame.score,
        avgBrightness: bestFrame.avgBrightness,
        contrast: bestFrame.contrast,
        avgSaturation: bestFrame.avgSaturation,
        edgeScore: bestFrame.edgeScore,
      },
      candidates: candidates
        .slice(0, 8)
        .map(({ second, score, avgBrightness, contrast, avgSaturation, edgeScore }) => ({
          second,
          score,
          avgBrightness,
          contrast,
          avgSaturation,
          edgeScore,
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