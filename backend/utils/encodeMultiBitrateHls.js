const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const getPngWatermarkPath = () => {
  const candidates = [
    path.join(__dirname, "..", "tools", "local-hls", "watermark.png"),
    path.join(__dirname, "..", "assets", "watermark.png"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
};

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

  return filtered.length ? filtered : [candidates[2]];
}

function buildPngFilterComplex(variant) {
  const { width, height } = variant;
  const padX = Math.max(16, Math.round(width * 0.022));
  const topPadY = Math.max(14, Math.round(height * 0.02));
  const padY = Math.max(14, Math.round(height * 0.082));
  const pngW = Math.max(88, Math.round(width * 0.2));
  const opacity = 0.9;
  const jumpSeconds = 7;
  const cornerIndex = `mod(floor(t/${jumpSeconds})*7+3,4)`;

  return [
    `[0:v]scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p[base]`,
    `[1:v]format=rgba,colorchannelmixer=aa=${opacity},scale=${pngW}:-1[wm]`,
    `[base][wm]overlay=` +
      `x='if(eq(${cornerIndex},0),${padX},if(eq(${cornerIndex},1),W-w-${padX},if(eq(${cornerIndex},2),${padX},W-w-${padX})))':` +
      `y='if(eq(${cornerIndex},0),${topPadY},if(eq(${cornerIndex},1),${topPadY},if(eq(${cornerIndex},2),H-h-${padY},H-h-${padY})))'[v]`,
  ].join(";");
}

function encodeVariantHls(inputPath, outputDir, variant, withAudio, pngPath) {
  return new Promise((resolve, reject) => {
    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPattern = path.join(outputDir, "seg_%03d.ts");
    const command = ffmpeg(inputPath);

    command.input(pngPath);

    const outputOptions = [
      "-filter_complex", buildPngFilterComplex(variant),
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
      outputOptions.push("-map 0:a?", `-b:a ${variant.audioBitrate}`, "-ac 2", "-ar 48000");
    } else {
      outputOptions.push("-an");
    }

    command
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(outputOptions)
      .output(playlistPath)
      .on("start", (cmd) => {
        console.log(`[HLS ${variant.name}] watermark=png-overlay`, cmd.slice(0, 120));
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
  const pngPath = getPngWatermarkPath();
  if (!pngPath) {
    throw new Error("Watermark PNG not found. Expected backend/assets/watermark.png.");
  }

  console.log("Starting multi bitrate HLS conversion:", variants.map((x) => x.name));
  console.log(`Watermark: png-overlay (${pngPath})`);

  for (const variant of variants) {
    const variantDir = path.join(outputDir, variant.name);
    ensureDir(variantDir);
    await encodeVariantHls(inputPath, variantDir, variant, withAudio, pngPath);
  }

  const masterContent = buildMasterPlaylist(variants);
  fs.writeFileSync(path.join(outputDir, "master.m3u8"), masterContent, "utf8");

  return {
    variants,
    masterPath: path.join(outputDir, "master.m3u8"),
    watermarkEnabled: true,
    watermarkType: "png-overlay",
  };
}

module.exports = { encodeMultiBitrateHls };
