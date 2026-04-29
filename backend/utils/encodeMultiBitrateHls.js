const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { buildWatermarkFilter } = require("./watermark");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createVariantDefinitions(srcWidth, srcHeight) {
  const candidates = [
    {
      name: "1080p",
      width: 1920,
      height: 1080,
      videoBitrate: "5000k",
      maxrate: "5350k",
      bufsize: "7500k",
      audioBitrate: "192k",
      bandwidth: 5500000,
    },
    {
      name: "720p",
      width: 1280,
      height: 720,
      videoBitrate: "2800k",
      maxrate: "2996k",
      bufsize: "4200k",
      audioBitrate: "128k",
      bandwidth: 3000000,
    },
    {
      name: "480p",
      width: 854,
      height: 480,
      videoBitrate: "1400k",
      maxrate: "1498k",
      bufsize: "2100k",
      audioBitrate: "96k",
      bandwidth: 1500000,
    },
  ];

  const filtered = candidates.filter(
    (v) => srcHeight >= v.height || srcWidth >= v.width
  );

  return filtered.length ? filtered : [candidates[2]];
}

function buildMasterPlaylist(variants) {
  let content = "#EXTM3U\n#EXT-X-VERSION:3\n";
  for (const v of variants) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.width}x${v.height}\n`;
    content += `${v.name}/index.m3u8\n`;
  }
  return content;
}

function encodeVariantHls(inputPath, outputDir, variant, withAudio) {
  return new Promise((resolve, reject) => {
    const { filterComplex, logoPath } = buildWatermarkFilter(
      variant.width,
      variant.height
    );

    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPattern = path.join(outputDir, "seg_%03d.ts");

    const command = ffmpeg(inputPath);

    if (logoPath) {
      command.input(logoPath);
    }

    const outputOptions = [
      "-filter_complex", filterComplex,
      "-map [v]",
      "-preset veryfast",
      "-profile:v main",
      "-crf 20",
      "-sc_threshold 0",
      "-g 48",
      "-keyint_min 48",
      `-b:v ${variant.videoBitrate}`,
      `-maxrate ${variant.maxrate}`,
      `-bufsize ${variant.bufsize}`,
      "-hls_time 6",
      "-hls_playlist_type vod",
      "-hls_list_size 0",
      "-hls_flags independent_segments",
      `-hls_segment_filename ${segmentPattern}`,
    ];

    if (withAudio) {
      outputOptions.push(
        "-map 0:a?",
        `-b:a ${variant.audioBitrate}`,
        "-ac 2",
        "-ar 48000"
      );
    } else {
      outputOptions.push("-an");
    }

    command
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(outputOptions)
      .output(playlistPath)
      .on("start", (cmd) => {
        console.log(`[HLS ${variant.name}] watermark=burn-in logo=${!!logoPath}`, cmd.slice(0, 140));
      })
      .on("end", () => resolve(variant))
      .on("error", reject)
      .run();
  });
}

async function encodeMultiBitrateHls({
  inputPath,
  outputDir,
  srcWidth,
  srcHeight,
  withAudio = true,
}) {
  if (!inputPath) throw new Error("inputPath is required");
  if (!outputDir) throw new Error("outputDir is required");

  ensureDir(outputDir);

  const variants = createVariantDefinitions(srcWidth, srcHeight);

  console.log("Starting multi-bitrate HLS with watermark burn-in:", variants.map((v) => v.name));

  for (const variant of variants) {
    const variantDir = path.join(outputDir, variant.name);
    ensureDir(variantDir);
    await encodeVariantHls(inputPath, variantDir, variant, withAudio);
  }

  const masterContent = buildMasterPlaylist(variants);
  fs.writeFileSync(path.join(outputDir, "master.m3u8"), masterContent, "utf8");

  return {
    variants,
    masterPath: path.join(outputDir, "master.m3u8"),
    watermarkEnabled: true,
    watermarkType: "text+logo-burn-in",
  };
}

module.exports = { encodeMultiBitrateHls };
