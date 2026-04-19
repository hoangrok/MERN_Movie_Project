const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const sharp = require("sharp");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "movie";
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
      Math.max(0.4, duration * 0.18),
      Math.max(0.8, duration * 0.42),
      Math.max(1.2, duration * 0.68),
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

async function analyzeFrame(filePath) {
  const { data, info } = await sharp(filePath)
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
    avgBrightness,
    contrast,
    avgSaturation,
    edgeScore: normalizedEdge,
  };
}

async function buildTileBuffer(filePath, width, height) {
  return sharp(filePath)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: false,
    })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

async function createBackdropFromFrames(framePaths, outWidth = 1920, outHeight = 1080) {
  const gap = 18;
  const leftWidth = Math.round(outWidth * 0.34);
  const centerWidth = Math.round(outWidth * 0.32);
  const rightWidth = outWidth - leftWidth - centerWidth - gap * 2;

  const tiles = await Promise.all([
    buildTileBuffer(framePaths[0], leftWidth, outHeight),
    buildTileBuffer(framePaths[1], centerWidth, outHeight),
    buildTileBuffer(framePaths[2], rightWidth, outHeight),
  ]);

  const collage = await sharp({
    create: {
      width: outWidth,
      height: outHeight,
      channels: 3,
      background: { r: 6, g: 8, b: 12 },
    },
  })
    .composite([
      { input: tiles[0], left: 0, top: 0 },
      { input: tiles[1], left: leftWidth + gap, top: 0 },
      { input: tiles[2], left: leftWidth + centerWidth + gap * 2, top: 0 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const blurred = await sharp(collage)
    .resize(Math.round(outWidth * 1.08), Math.round(outHeight * 1.08), {
      fit: "cover",
    })
    .blur(18)
    .modulate({ brightness: 0.86, saturation: 1.08 })
    .toBuffer();

  const finalBuffer = await sharp(blurred)
    .resize(outWidth, outHeight, { fit: "cover" })
    .composite([
      {
        input: await sharp(collage)
          .modulate({ brightness: 1.02, saturation: 1.06 })
          .toBuffer(),
        left: 0,
        top: 0,
        blend: "over",
      },
      {
        input: await sharp({
          create: {
            width: outWidth,
            height: outHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          .composite([
            {
              input: Buffer.from(
                `<svg width="${outWidth}" height="${outHeight}">
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stop-color="rgba(4,6,12,0.88)" />
                      <stop offset="22%" stop-color="rgba(4,6,12,0.58)" />
                      <stop offset="52%" stop-color="rgba(4,6,12,0.18)" />
                      <stop offset="100%" stop-color="rgba(4,6,12,0.80)" />
                    </linearGradient>
                    <radialGradient id="g2" cx="78%" cy="14%" r="26%">
                      <stop offset="0%" stop-color="rgba(255,70,90,0.16)" />
                      <stop offset="100%" stop-color="rgba(255,70,90,0)" />
                    </radialGradient>
                    <radialGradient id="g3" cx="12%" cy="16%" r="20%">
                      <stop offset="0%" stop-color="rgba(0,110,255,0.14)" />
                      <stop offset="100%" stop-color="rgba(0,110,255,0)" />
                    </radialGradient>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#g1)" />
                  <rect width="100%" height="100%" fill="url(#g2)" />
                  <rect width="100%" height="100%" fill="url(#g3)" />
                </svg>`
              ),
              top: 0,
              left: 0,
            },
          ])
          .png()
          .toBuffer(),
        top: 0,
        left: 0,
        blend: "over",
      },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  return finalBuffer;
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

  try {
    const duration = await getVideoDuration(videoPath);
    const timestamps = buildCandidateTimestamps(duration, Number(options.candidateCount) || 12);

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

        const metrics = await analyzeFrame(framePath);
        candidates.push({
          second,
          path: framePath,
          ...metrics,
        });
      } catch (err) {
        console.warn(`capture frame failed at ${second}s:`, err.message);
      }
    }

    if (candidates.length < 3) {
      throw new Error("Not enough good frames to build backdrop");
    }

    candidates.sort((a, b) => b.score - a.score);

    const picked = [];
    const sortedByTime = [...candidates].sort((a, b) => a.second - b.second);
    const minGap = Math.max(3, duration / 6);

    for (const frame of sortedByTime) {
      if (picked.length >= 3) break;

      const isFarEnough = picked.every(
        (item) => Math.abs(item.second - frame.second) >= minGap
      );

      if (isFarEnough) picked.push(frame);
    }

    if (picked.length < 3) {
      for (const frame of candidates) {
        if (picked.length >= 3) break;
        if (!picked.find((x) => x.path === frame.path)) {
          picked.push(frame);
        }
      }
    }

    picked.sort((a, b) => a.second - b.second);

    const finalBuffer = await createBackdropFromFrames(
      picked.slice(0, 3).map((x) => x.path),
      Number(options.width) || 1920,
      Number(options.height) || 1080
    );

    const r2Key = `backdrops/${safeMovieId}/${Date.now()}-${randomId(6)}.jpg`;
    const backdropUrl = await uploadBufferToR2(finalBuffer, r2Key, "image/jpeg");

    await cleanupFiles(tempFiles, [jobDir]);

    return {
      backdropUrl,
      r2Key,
      duration: Number(duration.toFixed(2)),
      capturedAt: picked.slice(0, 3).map((x) => x.second),
      bestFrames: picked.slice(0, 3).map((x) => ({
        second: x.second,
        score: Number(x.score.toFixed(2)),
        avgBrightness: Number(x.avgBrightness.toFixed(2)),
        contrast: Number(x.contrast.toFixed(2)),
        avgSaturation: Number(x.avgSaturation.toFixed(4)),
        edgeScore: Number(x.edgeScore.toFixed(2)),
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