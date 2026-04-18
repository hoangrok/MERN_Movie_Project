/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

const axios = require("axios");
const FormData = require("form-data");

const CONFIG = {
  apiBase: "https://api.clipdam18.com/api",
  token: "69c230cfd03df0546a5d2a3d", // <-- dán token admin vào đây
  watermarkPath: path.join(__dirname, "watermark.png"),
  outputDir: path.join(__dirname, "output"),
  ffmpegPath: "ffmpeg",
};

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
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
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

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(CONFIG.ffmpegPath, args, {
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
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function burnWatermark(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Không tìm thấy video: ${inputPath}`);
  }

  if (!fs.existsSync(CONFIG.watermarkPath)) {
    throw new Error(`Không tìm thấy watermark: ${CONFIG.watermarkPath}`);
  }

  ensureDir(CONFIG.outputDir);

  const originalName = path.basename(inputPath);
  const ext = path.extname(originalName) || ".mp4";
  const base = safeBaseName(path.parse(originalName).name) || "video";

  const outputPath = path.join(
    CONFIG.outputDir,
    `${Date.now()}-${base}-watermark${ext}`
  );

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

  console.log("\n🔥 Đang burn watermark...\n");
  await runFfmpeg(args);

  if (!fs.existsSync(outputPath)) {
    throw new Error("Burn watermark xong nhưng không thấy file output");
  }

  return outputPath;
}

async function createMovie(payload) {
  const res = await axios.post(`${CONFIG.apiBase}/movies`, payload, {
    headers: {
      Authorization: `Bearer ${CONFIG.token}`,
      "Content-Type": "application/json",
    },
    timeout: 1000 * 60,
  });

  if (!res.data?.success || !res.data?.movie?._id) {
    throw new Error(res.data?.message || "Tạo movie thất bại");
  }

  return res.data.movie;
}

async function uploadVideo(movieId, filePath) {
  const stats = fs.statSync(filePath);
  const form = new FormData();
  form.append("video", fs.createReadStream(filePath));

  console.log(`\n📤 Đang upload video: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);

  const res = await axios.post(
    `${CONFIG.apiBase}/upload/video/${movieId}`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${CONFIG.token}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 1000 * 60 * 30,
      onUploadProgress: (progressEvent) => {
        const total = progressEvent.total || stats.size;
        const loaded = progressEvent.loaded || 0;
        const percent = total ? Math.round((loaded / total) * 100) : 0;
        process.stdout.write(`\rUpload: ${percent}%`);
      },
    }
  );

  process.stdout.write("\n");

  if (!res.data?.success) {
    throw new Error(res.data?.message || "Upload video thất bại");
  }

  return res.data;
}

async function getStatus(movieId) {
  const res = await axios.get(`${CONFIG.apiBase}/upload/status/${movieId}`, {
    headers: {
      Authorization: `Bearer ${CONFIG.token}`,
    },
    timeout: 1000 * 60,
  });

  if (!res.data?.success || !res.data?.movie) {
    throw new Error(res.data?.message || "Không lấy được status");
  }

  return res.data.movie;
}

async function pollUntilDone(movieId) {
  console.log("\n⏳ Đang chờ backend xử lý...\n");

  while (true) {
    const movie = await getStatus(movieId);
    const status = movie?.status || "unknown";

    console.log(
      `[${new Date().toLocaleTimeString()}] status=${status} hlsUrl=${
        movie?.hlsUrl || ""
      }`
    );

    if (status === "ready") {
      return movie;
    }

    if (status === "failed") {
      throw new Error(movie?.processingError || "Xử lý video thất bại");
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

async function main() {
  try {
    if (!CONFIG.token) {
      throw new Error("Bạn chưa dán token admin vào CONFIG.token");
    }

    const inputPathRaw = await ask("Nhập đường dẫn file video: ");
    const inputPath = inputPathRaw.replace(/^"(.*)"$/, "$1");

    const title = await ask("Tên phim: ");
    const description = await ask("Mô tả: ");
    const genreText = await ask("Genre (vd: Action, Drama): ");
    const year = await ask("Năm: ");
    const rating = await ask("Rating: ");
    const duration = await ask("Thời lượng phút: ");

    const watermarkedPath = await burnWatermark(inputPath);

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
    console.log(`✅ Movie created: ${movie._id}`);

    const uploadData = await uploadVideo(movie._id, watermarkedPath);
    console.log("✅ Upload xong, backend response:", uploadData.message);

    const finalMovie = await pollUntilDone(movie._id);

    console.log("\n🎉 HOÀN TẤT");
    console.log("Movie ID:", finalMovie._id);
    console.log("Status:", finalMovie.status);
    console.log("HLS URL:", finalMovie.hlsUrl || "");
    console.log("Poster:", finalMovie.poster || "");
    console.log("Backdrop:", finalMovie.backdrop || "");
  } catch (err) {
    console.error("\n❌ LỖI:", err.message);
    process.exit(1);
  }
}

main();