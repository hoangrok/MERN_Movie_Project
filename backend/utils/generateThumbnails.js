const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateThumbnails(videoPath, outputDir, baseName) {
  return new Promise((resolve, reject) => {
    ensureDir(outputDir);

    const posterPath = path.join(outputDir, `${baseName}-poster.jpg`);
    const backdropPath = path.join(outputDir, `${baseName}-backdrop.jpg`);

    ffmpeg(videoPath)
      .screenshots([
        {
          timestamps: ["3"],
          filename: `${baseName}-poster.jpg`,
          folder: outputDir,
          size: "400x600",
        },
        {
          timestamps: ["5"],
          filename: `${baseName}-backdrop.jpg`,
          folder: outputDir,
          size: "1280x720",
        },
      ])
      .on("end", () => {
        resolve({
          posterPath,
          backdropPath,
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

module.exports = generateThumbnails;