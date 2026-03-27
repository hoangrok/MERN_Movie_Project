const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function runFfmpeg(command) {
  return new Promise((resolve, reject) => {
    command
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

/**
 * Tạo thumbnail kiểu Netflix:
 * - 1 backdrop ngang 16:9
 * - 1 poster dọc 2:3
 * - tăng contrast/saturation nhẹ
 * - làm tối nhẹ để nhìn cinematic hơn
 */
async function generateThumbnails(videoPath, outputDir, baseName = `thumb-${Date.now()}`) {
  ensureDir(outputDir);

  const backdropPath = path.join(outputDir, `${baseName}-backdrop.jpg`);
  const posterPath = path.join(outputDir, `${baseName}-poster.jpg`);

  // Chụp ảnh ngang 16:9
  await runFfmpeg(
    ffmpeg(videoPath)
      .seekInput("00:00:08")
      .frames(1)
      .outputOptions([
        "-vf",
        [
          // lấy frame giữa, scale đẹp, crop chuẩn 16:9, tăng màu nhẹ, tối nhẹ
          "scale=1280:720:force_original_aspect_ratio=increase",
          "crop=1280:720",
          "eq=contrast=1.08:saturation=1.12:brightness=-0.03",
          "unsharp=5:5:0.8:3:3:0.4",
        ].join(","),
      ])
      .output(backdropPath)
  );

  // Chụp ảnh dọc 2:3 từ frame khác một chút
  await runFfmpeg(
    ffmpeg(videoPath)
      .seekInput("00:00:12")
      .frames(1)
      .outputOptions([
        "-vf",
        [
          // poster dọc kiểu streaming app
          "scale=600:900:force_original_aspect_ratio=increase",
          "crop=600:900",
          "eq=contrast=1.1:saturation=1.08:brightness=-0.04",
          "unsharp=5:5:0.8:3:3:0.4",
        ].join(","),
      ])
      .output(posterPath)
  );

  return {
    posterPath,
    backdropPath,
  };
}

module.exports = generateThumbnails;