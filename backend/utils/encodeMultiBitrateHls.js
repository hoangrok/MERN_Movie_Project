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
      watermarkWidth: 260,
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
      watermarkWidth: 210,
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
      watermarkWidth: 165,
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
      watermarkWidth: 165,
    },
  ];
}

function escapeFfmpegPath(filePath) {
  return String(filePath).replace(/\\/g, "/").replace(/:/g, "\\:");
}

function buildVideoFilter(variant, watermarkPath) {
  const baseScalePad = [
    `scale=w=${variant.width}:h=${variant.height}:force_original_aspect_ratio=decrease`,
    `pad=${variant.width}:${variant.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    "format=yuv420p",
  ];

  if (!watermarkPath || !fs.existsSync(watermarkPath)) {
    return {
      inputOptions: [],
      complexFilter: null,
      mapOptions: [],
      simpleVf: baseScalePad.join(","),
    };
  }

  const wmWidth = variant.watermarkWidth || 200;
  const marginX = Math.max(18, Math.round(variant.width * 0.02));
  const marginY = Math.max(16, Math.round(variant.height * 0.024));

  const escapedWatermarkPath = escapeFfmpegPath(watermarkPath);

  const complexFilter = [
    `[0:v]${baseScalePad.join(",")}[base]`,
    `[1:v]scale=${wmWidth}:-1,format=rgba,colorchannelmixer=aa=0.78[wm]`,
    `[base][wm]overlay=W-w-${marginX}:H-h-${marginY}:format=auto[vout]`,
  ].join(";");

  return {
    inputOptions: ["-i", escapedWatermarkPath],
    complexFilter,
    mapOptions: ["-map", "[vout]"],
    simpleVf: null,
  };
}

function encodeVariantHls(inputPath, outputDir, variant, withAudio, watermarkPath) {
  return new Promise((resolve, reject) => {
    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPattern = path.join(outputDir, "seg_%03d.ts");

    const { inputOptions, complexFilter, mapOptions, simpleVf } =
      buildVideoFilter(variant, watermarkPath);

    const command = ffmpeg();

    command.input(inputPath);

    if (inputOptions.length >= 2) {
      command.input(watermarkPath);
    }

    command.videoCodec("libx264");

    const outputOptions = [
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

    if (complexFilter) {
      outputOptions.push("-filter_complex", complexFilter, ...mapOptions);
    } else {
      outputOptions.push("-vf", simpleVf);
    }

    if (withAudio) {
      outputOptions.push(
        `-b:a ${variant.audioBitrate}`,
        "-ac 2",
        "-ar 48000"
      );
    } else {
      outputOptions.push("-an");
    }

    command.outputOptions(outputOptions);

    if (withAudio) {
      if (complexFilter) {
        outputOptions.push("-map", "0:a?");
      }
      command.audioCodec("aac");
    } else {
      command.noAudio();
    }

    command
      .output(playlistPath)
      .on("start", (cmd) => {
        console.log(`[HLS ${variant.name}]`, cmd);
        if (watermarkPath && fs.existsSync(watermarkPath)) {
          console.log(`[HLS ${variant.name}] watermark:`, watermarkPath);
        }
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
  watermarkPath = process.env.VIDEO_WATERMARK_PATH
    ? path.resolve(process.env.VIDEO_WATERMARK_PATH)
    : path.resolve(process.cwd(), "assets", "watermark.png"),
}) {
  if (!inputPath) throw new Error("inputPath is required");
  if (!outputDir) throw new Error("outputDir is required");

  ensureDir(outputDir);

  const variants = createVariantDefinitions(srcWidth, srcHeight);
  const hasWatermark = !!watermarkPath && fs.existsSync(watermarkPath);

  console.log(
    "3️⃣ Bắt đầu convert multi bitrate HLS:",
    variants.map((x) => x.name)
  );
  console.log(
    hasWatermark
      ? `🖼️ Watermark enabled: ${watermarkPath}`
      : "⚠️ Watermark disabled: file not found"
  );

  for (const variant of variants) {
    const variantDir = path.join(outputDir, variant.name);
    ensureDir(variantDir);
    await encodeVariantHls(
      inputPath,
      variantDir,
      variant,
      withAudio,
      hasWatermark ? watermarkPath : null
    );
  }

  const masterContent = buildMasterPlaylist(variants);
  fs.writeFileSync(path.join(outputDir, "master.m3u8"), masterContent, "utf8");

  return {
    variants,
    masterPath: path.join(outputDir, "master.m3u8"),
    watermarkEnabled: hasWatermark,
    watermarkPath: hasWatermark ? watermarkPath : null,
  };
}

module.exports = {
  encodeMultiBitrateHls,
};