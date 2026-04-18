/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");
const dotenv = require("dotenv");
const axios = require("axios");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

dotenv.config({ path: path.join(__dirname, ".env") });

const CONFIG = {
  apiBase: process.env.API_BASE,
  adminToken: process.env.ADMIN_TOKEN,
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2Bucket: process.env.R2_BUCKET,
  r2PublicBaseUrl: (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
  streamBaseUrl: (process.env.STREAM_BASE_URL || "").replace(/\/+$/, ""),
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  watermarkPath: path.resolve(__dirname, process.env.WATERMARK_PATH || "./watermark.png"),
  outputRoot: path.join(__dirname, "output"),
};

ffmpeg.setFfmpegPath(CONFIG.ffmpegPath);

const r2 = new S3Client({
  endpoint: `https://${CONFIG.r2AccountId}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: CONFIG.r2AccessKeyId,
    secretAccessKey: CONFIG.r2SecretAccessKey,
  },
});

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || "").trim());
    });
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cleanup(target) {
  try {
    if (target && fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn("cleanup warning:", err.message);
  }
}

function safeBaseName(name = "") {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getContentType(file) {
  if (file.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (file.endsWith(".ts")) return "video/MP2T";
  if (file.endsWith(".mp4")) return "video/mp4";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

async function uploadFileToR2(key, filePath) {
  const body = fs.readFileSync(filePath);
  await r2.send(
    new PutObjectCommand({
      Bucket: CONFIG.r2Bucket,
      Key: key,
      Body: body,
      ContentType: getContentType(filePath.toLowerCase()),
    })
  );
}

function ffprobeAsync(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      if (text.trim()) console.log(text.trim());
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      if (text.trim()) console.log(text.trim());
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
  });
}

async function burnWatermark(inputPath, workDir) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Không tìm thấy video: ${inputPath}`);
  }

  if (!fs.existsSync(CONFIG.watermarkPath)) {
    throw new Error(`Không tìm thấy watermark: ${CONFIG.watermarkPath}`);
  }

  const outputPath = path.join(workDir, "watermarked.mp4");

  const args = [
    "-y",
    "-i",
    `"${inputPath}"`,
    "-i",
    `"${CONFIG.watermarkPath}"`,
    "-filter_complex",
    `"[1:v]scale=120:-1[wm];[0:v][wm]overlay=W-w-20:H-h-20"`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    `"${outputPath}"`,
  ];

  console.log("\n🔥 Đang burn watermark local...\n");
  await runCommand(CONFIG.ffmpegPath, args);

  if (!fs.existsSync(outputPath)) {
    throw new Error("Không tạo được file watermarked.mp4");
  }

  return outputPath;
}

async function createHlsCopyMode(inputPath, workDir) {
  const hlsDir = path.join(workDir, "hls");
  ensureDir(hlsDir);

  const masterPath = path.join(hlsDir, "master.m3u8");

  const args = [
    "-y",
    "-i",
    `"${inputPath}"`,
    "-c",
    "copy",
    "-start_number",
    "0",
    "-hls_time",
    "6",
    "-hls_list_size",
    "0",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_filename",
    `"${path.join(hlsDir, "seg_%03d.ts")}"`,
    "-f",
    "hls",
    `"${masterPath}"`,
  ];

  console.log("\n⚡ Đang tạo HLS local (copy mode)...\n");
  await runCommand(CONFIG.ffmpegPath, args);

  if (!fs.existsSync(masterPath)) {
    throw new Error("Không tạo được master.m3u8");
  }

  return hlsDir;
}

async function takeBestScreenshot(inputPath, outPath) {
  const probe = await ffprobeAsync(inputPath);
  const duration = Number(probe?.format?.duration || 0);
  const at = Math.max(2, Math.floor(duration * 0.2) || 3);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(at)
      .frames(1)
      .outputOptions(["-q:v 2"])
      .output(outPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  if (!fs.existsSync(outPath)) {
    throw new Error("Không tạo được ảnh screenshot");
  }
}

async function createPosterBackdrop(inputPath, workDir) {
  const sourceShot = path.join(workDir, "source-shot.jpg");
  const posterPath = path.join(workDir, "poster.jpg");
  const backdropPath = path.join(workDir, "backdrop.jpg");

  console.log("\n🖼 Đang tạo poster/backdrop local...\n");
  await takeBestScreenshot(inputPath, sourceShot);

  await sharp(sourceShot)
    .resize(400, 600, {
      fit: "cover",
      position: "attention",
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(posterPath);

  await sharp(sourceShot)
    .resize(1280, 720, {
      fit: "cover",
      position: "attention",
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(backdropPath);

  return {
    posterPath,
    backdropPath,
  };
}

async function createMovie(payload) {
  const res = await axios.post(`${CONFIG.apiBase}/movies`, payload, {
    headers: {
      Authorization: CONFIG.adminToken,
      "Content-Type": "application/json",
    },
    timeout: 1000 * 60,
  });

  if (!res.data?.success || !res.data?.movie?._id) {
    throw new Error(res.data?.message || "Tạo movie thất bại");
  }

  return res.data.movie;
}

async function updateMovie(movieId, payload) {
  const res = await axios.put(`${CONFIG.apiBase}/movies/${movieId}`, payload, {
    headers: {
      Authorization: CONFIG.adminToken,
      "Content-Type": "application/json",
    },
    timeout: 1000 * 60,
  });

  if (!res.data?.success || !res.data?.movie) {
    throw new Error(res.data?.message || "Cập nhật movie thất bại");
  }

  return res.data.movie;
}

async function uploadFolderToR2(localDir, remotePrefix) {
  const files = fs.readdirSync(localDir);

  for (const file of files) {
    const filePath = path.join(localDir, file);
    if (!fs.statSync(filePath).isFile()) continue;

    const key = `${remotePrefix}/${file}`;
    console.log("☁️ Upload R2:", key);
    await uploadFileToR2(key, filePath);
  }
}

async function main() {
  let workDir = null;

  try {
    if (!CONFIG.apiBase) throw new Error("Thiếu API_BASE trong .env");
    if (!CONFIG.adminToken) throw new Error("Thiếu ADMIN_TOKEN trong .env");
    if (!CONFIG.r2AccountId) throw new Error("Thiếu R2_ACCOUNT_ID trong .env");
    if (!CONFIG.r2AccessKeyId) throw new Error("Thiếu R2_ACCESS_KEY_ID trong .env");
    if (!CONFIG.r2SecretAccessKey) throw new Error("Thiếu R2_SECRET_ACCESS_KEY trong .env");
    if (!CONFIG.r2Bucket) throw new Error("Thiếu R2_BUCKET trong .env");
    if (!CONFIG.r2PublicBaseUrl) throw new Error("Thiếu R2_PUBLIC_BASE_URL trong .env");
    if (!CONFIG.streamBaseUrl) throw new Error("Thiếu STREAM_BASE_URL trong .env");

    ensureDir(CONFIG.outputRoot);

    const inputPathRaw = await ask("Nhập đường dẫn file video: ");
    const inputPath = inputPathRaw.replace(/^"(.*)"$/, "$1");

    const title = await ask("Tên phim: ");
    const description = await ask("Mô tả: ");
    const genreText = await ask("Genre (vd: Action, Drama): ");
    const year = await ask("Năm: ");
    const rating = await ask("Rating: ");
    const duration = await ask("Thời lượng phút: ");

    const folderName = `${Date.now()}-${safeBaseName(path.parse(inputPath).name) || "movie"}`;
    workDir = path.join(CONFIG.outputRoot, folderName);
    ensureDir(workDir);

    const payload = {
      title: title || path.parse(inputPath).name,
      description: description || "",
      genre: genreText
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      year: year ? Number(year) : null,
      rating: rating ? Number(rating) : 0,
      duration: duration ? Number(duration) : 0,
      isPublished: true,
    };

    console.log("\n📝 Đang tạo movie...\n");
    const movie = await createMovie(payload);
    const movieId = movie._id;
    console.log(`✅ Movie created: ${movieId}`);

    const watermarkedPath = await burnWatermark(inputPath, workDir);
    const hlsDir = await createHlsCopyMode(watermarkedPath, workDir);
    const { posterPath, backdropPath } = await createPosterBackdrop(
      watermarkedPath,
      workDir
    );

    console.log("\n☁️ Upload HLS lên R2...\n");
    await uploadFolderToR2(hlsDir, `videos/${movieId}/hls`);

    console.log("\n☁️ Upload poster/backdrop lên R2...\n");
    await uploadFileToR2(`videos/${movieId}/poster.jpg`, posterPath);
    await uploadFileToR2(`videos/${movieId}/backdrop.jpg`, backdropPath);

    const posterUrl = `${CONFIG.r2PublicBaseUrl}/videos/${movieId}/poster.jpg`;
    const backdropUrl = `${CONFIG.r2PublicBaseUrl}/videos/${movieId}/backdrop.jpg`;
    const hlsUrl = `${CONFIG.streamBaseUrl}/videos/${movieId}/hls/master.m3u8`;

    console.log("\n🛠 Đang cập nhật movie...\n");
    const updatedMovie = await updateMovie(movieId, {
      title: payload.title,
      description: payload.description,
      year: payload.year,
      rating: payload.rating,
      duration: payload.duration,
      genre: genreText,
      poster: posterUrl,
      backdrop: backdropUrl,
      hlsUrl,
      isPublished: true,
    });

    console.log("\n🎉 HOÀN TẤT");
    console.log("Movie ID:", updatedMovie._id);
    console.log("Poster:", updatedMovie.poster || posterUrl);
    console.log("Backdrop:", updatedMovie.backdrop || backdropUrl);
    console.log("HLS URL:", updatedMovie.hlsUrl || hlsUrl);
    console.log("\n✅ Giờ mở trang movie là xem được luôn, không cần chờ processing.");
  } catch (err) {
    console.error("\n❌ LỖI:", err.message);
    process.exit(1);
  } finally {
    // giữ file local lại để bạn kiểm tra; muốn auto xoá thì bỏ comment dòng dưới
    // cleanup(workDir);
  }
}

main();