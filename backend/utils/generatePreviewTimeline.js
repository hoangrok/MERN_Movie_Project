const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const takeScreenshot = (videoPath, outputPath, timestampSec, size) =>
  new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(Math.max(0, Number(timestampSec) || 0))
      .frames(1)
      .outputOptions(["-q:v 2"])
      .size(size)
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

module.exports = async function generatePreviewTimeline(
  videoPath,
  outputDir,
  options = {}
) {
  const interval = Number(options.interval) || 10;
  const prefix = options.prefix || "preview";
  const size = options.size || "320x180";
  const startAt = Number(options.startAt) || 5;

  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      console.warn("generatePreviewTimeline: missing videoPath", videoPath);
      return {
        duration: 0,
        interval,
        items: [],
      };
    }

    if (!outputDir) {
      console.warn("generatePreviewTimeline: missing outputDir");
      return {
        duration: 0,
        interval,
        items: [],
      };
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, data) => {
        if (err) return reject(err);
        resolve(data || {});
      });
    });

    const rawDuration = Number(metadata?.format?.duration || 0);
    const duration = Math.max(0, Math.floor(rawDuration));

    if (!duration) {
      return {
        duration: 0,
        interval,
        items: [],
      };
    }

    const timestamps = [];
    for (let t = startAt; t < duration; t += interval) {
      timestamps.push(t);
    }

    if (!timestamps.length) {
      timestamps.push(Math.max(0, Math.min(startAt, duration - 1)));
    }

    const items = [];

    for (let i = 0; i < timestamps.length; i++) {
      const second = timestamps[i];
      const fileName = `${prefix}_${i + 1}.jpg`;
      const filePath = path.join(outputDir, fileName);

      try {
        await takeScreenshot(videoPath, filePath, second, size);

        if (!fs.existsSync(filePath)) {
          console.warn("generatePreviewTimeline: file not created", filePath);
          continue;
        }

        const stat = fs.statSync(filePath);
        if (!stat.size || stat.size < 1024) {
          console.warn("generatePreviewTimeline: preview too small", fileName);
          fs.rmSync(filePath, { force: true });
          continue;
        }

        items.push({
          second,
          fileName,
          path: filePath,
        });
      } catch (err) {
        console.warn(
          `generatePreviewTimeline: screenshot failed at ${second}s:`,
          err.message
        );
      }
    }

    return {
      duration,
      interval,
      items,
    };
  } catch (err) {
    console.warn("generatePreviewTimeline fatal fallback:", err.message);
    return {
      duration: 0,
      interval,
      items: [],
    };
  }
};