const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

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
    (item) => srcHeight >= item.height || srcWidth >= item.width
  );

  if (filtered.length) return filtered;

  return [
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
}

function encodeVariantHls(inputPath, outputDir, variant, withAudio) {
  return new Promise((resolve, reject) => {
    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPattern = path.join(outputDir, "seg_%03d.ts");

    const vf = [
      `scale=w=${variant.width}:h=${variant.height}:force_original_aspect_ratio=decrease`,
      `pad=${variant.width}:${variant.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      "format=yuv420p",
    ].join(",");

    const command = ffmpeg(inputPath)
      .videoCodec("libx264")
      .outputOptions([
        "-preset veryfast",
        "-profile:v main",
        "-crf 20",
        "-sc_threshold 0",
        "-g 48",
        "-keyint_min 48",
        `-b:v ${variant.videoBitrate}`,
        `-maxrate ${variant.maxrate}`,
        `-bufsize ${variant.bufsize}`,
        `-vf ${vf}`,
        "-hls_time 6",
        "-hls_playlist_type vod",
        "-hls_list_size 0",
        "-hls_flags independent_segments",
        `-hls_segment_filename ${segmentPattern}`,
      ]);

    if (withAudio) {
      command.audioCodec("aac").outputOptions([
        `-b:a ${variant.audioBitrate}`,
        "-ac 2",
        "-ar 48000",
      ]);
    } else {
      command.noAudio();
    }

    command
      .output(playlistPath)
      .on("start", (cmd) => {
        console.log(`[HLS ${variant.name}]`, cmd);
      })
      .on("end", () => resolve(variant))
      .on("error", reject)
      .run();
  });
}

function buildMasterPlaylist(variants) {
  let content = "#EXTM3U\n#EXT-X-VERSION:3\n";

  for (const item of variants) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${item.bandwidth},RESOLUTION=${item.width}x${item.height}\n`;
    content += `${item.name}/index.m3u8\n`;
  }

  return content;
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

  console.log(
    "3️⃣ Bắt đầu convert multi bitrate HLS:",
    variants.map((x) => x.name)
  );

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
  };
}

module.exports = {
  encodeMultiBitrateHls,
};