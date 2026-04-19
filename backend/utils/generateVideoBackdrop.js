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

function safeSeekPoints(duration) {
  if (duration <= 6) {
    return [
      Math.max(0.3, duration * 0.2),
      Math.max(0.6, duration * 0.5),
      Math.max(0.9, duration * 0.8),
    ];
  }

  return [
    Math.min(Math.max(1, duration * 0.15), Math.max(1, duration - 2.5)),
    Math.min(Math.max(2, duration * 0.45), Math.max(2, duration - 1.8)),
    Math.min(Math.max(3, duration * 0.75), Math.max(3, duration - 1.2)),
  ];
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

async function buildFrameBuffer(filePath, width, height) {
  return sharp(filePath)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

async function generateVideoBackdrop(videoPath, movieId = "movie") {
  if (!videoPath) {
    throw new Error("Missing videoPath");
  }

  const safeMovieId = sanitizeKeyPart(movieId);
  const tempRoot = path.join(process.cwd(), "tmp", "backdrops");
  const jobId = `${safeMovieId}-${Date.now()}-${randomId(6)}`;
  const jobDir = path.join(tempRoot, jobId);

  ensureDir(jobDir);

  const frame1 = path.join(jobDir, "frame-1.jpg");
  const frame2 = path.join(jobDir, "frame-2.jpg");
  const frame3 = path.join(jobDir, "frame-3.jpg");

  try {
    const duration = await getVideoDuration(videoPath);
    const [t1, t2, t3] = safeSeekPoints(duration);

    await captureFrame(videoPath, frame1, t1);
    await captureFrame(videoPath, frame2, t2);
    await captureFrame(videoPath, frame3, t3);

    const targetHeight = 720;
    const singleWidth = 1280;
    const gap = 16;

    const [img1, img2, img3] = await Promise.all([
      buildFrameBuffer(frame1, singleWidth, targetHeight),
      buildFrameBuffer(frame2, singleWidth, targetHeight),
      buildFrameBuffer(frame3, singleWidth, targetHeight),
    ]);

    const collageWidth = singleWidth * 3 + gap * 2;
    const collageHeight = targetHeight;

    const collageBuffer = await sharp({
      create: {
        width: collageWidth,
        height: collageHeight,
        channels: 3,
        background: { r: 8, g: 8, b: 12 },
      },
    })
      .composite([
        { input: img1, left: 0, top: 0 },
        { input: img2, left: singleWidth + gap, top: 0 },
        { input: img3, left: singleWidth * 2 + gap * 2, top: 0 },
      ])
      .jpeg({ quality: 86 })
      .toBuffer();

    const r2Key = `backdrops/${safeMovieId}/${Date.now()}-${randomId(6)}.jpg`;
    const backdropUrl = await uploadBufferToR2(
      collageBuffer,
      r2Key,
      "image/jpeg"
    );

    await cleanupFiles([frame1, frame2, frame3], [jobDir]);

    return {
      backdropUrl,
      r2Key,
      duration,
      capturedAt: [t1, t2, t3],
    };
  } catch (error) {
    await cleanupFiles([frame1, frame2, frame3], [jobDir]);
    throw error;
  }
}

module.exports = {
  generateVideoBackdrop,
};