const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const { buildWatermarkFilter } = require("./watermark");
const { buildGeometryFilter } = require("./videoGeometry");

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

function encodeVariantHls(inputPath, outputDir, variant, withAudio, options = {}) {
  return new Promise((resolve, reject) => {
    const withWatermark = options.withWatermark !== false;

    const baseVideoFilter = buildGeometryFilter({
      rotation: options.rotation || 0,
      targetWidth: variant.width,
      targetHeight: variant.height,
      allowUpscale: false,
      includeFormat: true,
    });

    const playlistPath = path.join(outputDir, "index.m3u8");
    const segmentPattern = path.join(outputDir, "seg_%03d.ts");

    const command = ffmpeg(inputPath).inputOptions(["-noautorotate", "-threads 2"]);

    let useFilterComplex = false;
    let filterComplex = "";
    let logoPath = "";

    if (withWatermark) {
      const wm = buildWatermarkFilter(variant.width, variant.height, { rotation: 0 });
      logoPath = wm.logoPath;
      filterComplex = wm.filterComplex.replace(
        "[0:v]",
        `[0:v]${baseVideoFilter}[scaled];[scaled]`
      );
      useFilterComplex = true;
      if (logoPath) command.input(logoPath);
    }

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

    // AES-128 encryption — keyInfoPath is a keyinfo.txt shared by all variants
    if (options.keyInfoPath) {
      outputOptions.push(`-hls_key_info_file ${options.keyInfoPath}`);
    }

    if (useFilterComplex) {
      outputOptions.unshift("-filter_complex", filterComplex, "-map [v]");
    } else {
      outputOptions.unshift("-vf", baseVideoFilter, "-map 0:v:0");
    }

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
        console.log(`[HLS ${variant.name}] encrypt=${!!options.keyInfoPath} watermark=${withWatermark}`, cmd.slice(0, 140));
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
  rotation = 0,
  withAudio = true,
  withWatermark = (process.env.WATERMARK_ENABLED !== "false"),
  keyDeliveryUrl = "",  // e.g. "https://api.clipdam18.com/api/hls-key/MOVIE_ID"
}) {
  if (!inputPath) throw new Error("inputPath is required");
  if (!outputDir) throw new Error("outputDir is required");

  ensureDir(outputDir);

  const variants = createVariantDefinitions(srcWidth, srcHeight);

  // AES-128: generate key once, shared by all variants
  let encryptKeyHex = null;
  let keyInfoPath = null;

  if (keyDeliveryUrl) {
    const keyBytes = crypto.randomBytes(16);
    encryptKeyHex = keyBytes.toString("hex");

    const keyFilePath = path.join(outputDir, "hls.key");
    fs.writeFileSync(keyFilePath, keyBytes);

    // keyinfo format: line1=key URI, line2=local key file path
    // use forward slashes so ffmpeg on Linux handles it correctly
    keyInfoPath = path.join(outputDir, "keyinfo.txt");
    const keyFileForFfmpeg = keyFilePath.replace(/\\/g, "/");
    fs.writeFileSync(keyInfoPath, `${keyDeliveryUrl}\n${keyFileForFfmpeg}\n`);

    console.log(`HLS AES-128 encryption enabled → ${keyDeliveryUrl}`);
  }

  console.log(`Starting multi-bitrate HLS parallel watermark=${withWatermark} encrypt=${!!keyDeliveryUrl}:`, variants.map((v) => v.name));

  await Promise.all(
    variants.map((variant) => {
      const variantDir = path.join(outputDir, variant.name);
      ensureDir(variantDir);
      return encodeVariantHls(inputPath, variantDir, variant, withAudio, {
        rotation,
        withWatermark,
        keyInfoPath,
      });
    })
  );

  const masterContent = buildMasterPlaylist(variants);
  fs.writeFileSync(path.join(outputDir, "master.m3u8"), masterContent, "utf8");

  return {
    variants,
    masterPath: path.join(outputDir, "master.m3u8"),
    encryptKeyHex,
  };
}

module.exports = { encodeMultiBitrateHls };
