const sharp = require("sharp");

const COLOR_STORIES = [
  {
    name: "neon-noir",
    matches: ["action", "thriller", "crime", "mystery", "horror", "dark"],
    modulate: { brightness: 0.98, saturation: 1.18, lightness: 1.02 },
    linear: { a: 1.06, b: -7 },
    overlayTop: "rgba(16, 22, 54, 0.24)",
    overlayBottom: "rgba(227, 62, 62, 0.16)",
    vignette: 0.28,
  },
  {
    name: "rose-glam",
    matches: ["romance", "drama", "girl", "fashion", "glamour", "love"],
    modulate: { brightness: 1.04, saturation: 1.14, lightness: 1.05 },
    linear: { a: 1.02, b: 2 },
    overlayTop: "rgba(255, 230, 235, 0.18)",
    overlayBottom: "rgba(214, 93, 127, 0.14)",
    vignette: 0.2,
  },
  {
    name: "gold-heat",
    matches: ["asian", "jav", "hot", "party", "club", "dance"],
    modulate: { brightness: 1.03, saturation: 1.2, lightness: 1.03 },
    linear: { a: 1.04, b: 1 },
    overlayTop: "rgba(255, 215, 150, 0.16)",
    overlayBottom: "rgba(255, 120, 52, 0.16)",
    vignette: 0.24,
  },
  {
    name: "clean-luxe",
    matches: [],
    modulate: { brightness: 1.02, saturation: 1.08, lightness: 1.03 },
    linear: { a: 1.03, b: 0 },
    overlayTop: "rgba(255, 255, 255, 0.08)",
    overlayBottom: "rgba(24, 28, 38, 0.12)",
    vignette: 0.18,
  },
];

function normalizeGenres(genres = []) {
  return (Array.isArray(genres) ? genres : [genres])
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
}

function inferColorStory(genres = []) {
  const normalized = normalizeGenres(genres);

  for (const story of COLOR_STORIES) {
    if (!story.matches.length) continue;
    if (normalized.some((genre) => story.matches.some((keyword) => genre.includes(keyword)))) {
      return story;
    }
  }

  return COLOR_STORIES[COLOR_STORIES.length - 1];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isSkinTone(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  if (r > 95 && g > 40 && b > 20 && diff > 15 && Math.abs(r - g) > 15 && r > g && r > b) {
    return true;
  }

  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

async function analyzeFrameCandidate(filePath, { genres = [] } = {}) {
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const { data, info } = await image
    .clone()
    .resize(96, 96, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalPixels = info.width * info.height;
  let brightnessSum = 0;
  let brightnessSqSum = 0;
  let saturationSum = 0;
  let edgeScore = 0;
  let skinPixels = 0;
  let upperSkinPixels = 0;
  let interestWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let warmPixels = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const midLum = 1 - Math.min(1, Math.abs(lum - 145) / 145);
      const dx = (x / Math.max(1, info.width - 1)) - 0.5;
      const dy = (y / Math.max(1, info.height - 1)) - 0.45;
      const centerBias = 1 - clamp(Math.sqrt(dx * dx + dy * dy) / 0.72, 0, 1);
      const skin = isSkinTone(r, g, b);

      if (skin) {
        skinPixels += 1;
        if (y < info.height * 0.68) upperSkinPixels += 1;
      }

      if (r > g && g > b) {
        warmPixels += 1;
      }

      brightnessSum += lum;
      brightnessSqSum += lum * lum;
      saturationSum += sat;

      const idxRight = x < info.width - 1 ? idx + 3 : idx;
      const idxBottom = y < info.height - 1 ? idx + info.width * 3 : idx;
      const lumRight =
        0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
      const lumBottom =
        0.299 * data[idxBottom] + 0.587 * data[idxBottom + 1] + 0.114 * data[idxBottom + 2];
      const localEdge = Math.abs(lum - lumRight) + Math.abs(lum - lumBottom);
      edgeScore += localEdge;

      const interest =
        localEdge * 0.55 +
        sat * 64 +
        midLum * 22 +
        (skin ? 26 : 0) +
        centerBias * 18;

      interestWeight += interest;
      weightedX += interest * x;
      weightedY += interest * y;
    }
  }

  const avgBrightness = brightnessSum / totalPixels;
  const variance = brightnessSqSum / totalPixels - avgBrightness * avgBrightness;
  const contrast = Math.sqrt(Math.max(0, variance));
  const avgSaturation = saturationSum / totalPixels;
  const normalizedEdge = edgeScore / totalPixels;
  const skinRatio = skinPixels / totalPixels;
  const upperSkinRatio = upperSkinPixels / Math.max(1, totalPixels * 0.68);
  const warmRatio = warmPixels / totalPixels;

  const subjectX = clamp((weightedX / Math.max(1, interestWeight)) / info.width, 0.15, 0.85);
  const subjectY = clamp((weightedY / Math.max(1, interestWeight)) / info.height, 0.12, 0.82);
  const subjectConfidence = clamp(
    normalizedEdge / 22 + avgSaturation * 1.4 + skinRatio * 3.2,
    0,
    1.6
  );

  let frameScore = 0;

  if (avgBrightness >= 42 && avgBrightness <= 208) frameScore += 22;
  else if (avgBrightness >= 28 && avgBrightness <= 226) frameScore += 10;
  else frameScore -= 18;

  if (contrast >= 24) frameScore += 24;
  else if (contrast >= 16) frameScore += 14;
  else frameScore -= 14;

  if (avgSaturation >= 0.14) frameScore += 18;
  else if (avgSaturation >= 0.08) frameScore += 8;
  else frameScore -= 8;

  if (normalizedEdge >= 20) frameScore += 26;
  else if (normalizedEdge >= 13) frameScore += 14;
  else if (normalizedEdge >= 8) frameScore += 6;
  else frameScore -= 12;

  const faceProxy = skinRatio * 80 + upperSkinRatio * 42 + subjectConfidence * 10;
  const compositionBalance = 18 - Math.abs(subjectX - 0.42) * 28 - Math.abs(subjectY - 0.38) * 18;
  const posterScore = frameScore + faceProxy + compositionBalance;
  const backdropScore =
    frameScore + normalizedEdge * 0.65 + avgSaturation * 36 + warmRatio * 10;

  return {
    metadata,
    frameScore: Number(frameScore.toFixed(2)),
    posterScore: Number(posterScore.toFixed(2)),
    backdropScore: Number(backdropScore.toFixed(2)),
    avgBrightness: Number(avgBrightness.toFixed(2)),
    contrast: Number(contrast.toFixed(2)),
    avgSaturation: Number(avgSaturation.toFixed(4)),
    edgeScore: Number(normalizedEdge.toFixed(2)),
    skinRatio: Number(skinRatio.toFixed(4)),
    upperSkinRatio: Number(upperSkinRatio.toFixed(4)),
    warmRatio: Number(warmRatio.toFixed(4)),
    subjectX: Number(subjectX.toFixed(4)),
    subjectY: Number(subjectY.toFixed(4)),
    subjectConfidence: Number(subjectConfidence.toFixed(4)),
    faceProxy: Number(faceProxy.toFixed(2)),
    colorStory: inferColorStory(genres).name,
  };
}

function computeCropBox(sourceWidth, sourceHeight, targetWidth, targetHeight, analysis) {
  const sourceRatio = sourceWidth / Math.max(1, sourceHeight);
  const targetRatio = targetWidth / Math.max(1, targetHeight);
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceRatio > targetRatio) {
    cropWidth = Math.round(sourceHeight * targetRatio);
  } else {
    cropHeight = Math.round(sourceWidth / targetRatio);
  }

  const focusX = clamp((analysis?.subjectX ?? 0.5) * sourceWidth, cropWidth / 2, sourceWidth - cropWidth / 2);
  const focusY = clamp((analysis?.subjectY ?? 0.45) * sourceHeight, cropHeight / 2, sourceHeight - cropHeight / 2);
  const gravityY = analysis?.skinRatio > 0.02 ? 0.44 : 0.5;
  const left = clamp(Math.round(focusX - cropWidth / 2), 0, Math.max(0, sourceWidth - cropWidth));
  const top = clamp(
    Math.round(focusY - cropHeight * gravityY),
    0,
    Math.max(0, sourceHeight - cropHeight)
  );

  return {
    left,
    top,
    width: clamp(cropWidth, 1, sourceWidth),
    height: clamp(cropHeight, 1, sourceHeight),
  };
}

function buildOverlaySvg(width, height, story, mode = "poster") {
  const vignetteOpacity = mode === "poster" ? story.vignette : story.vignette * 0.9;
  const bottomBoost = mode === "poster" ? 0.16 : 0.12;

  return Buffer.from(
    `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v" cx="50%" cy="42%" r="74%">
          <stop offset="0%" stop-color="rgba(255,255,255,0)" />
          <stop offset="72%" stop-color="rgba(10,12,18,0)" />
          <stop offset="100%" stop-color="rgba(10,12,18,${vignetteOpacity})" />
        </radialGradient>
        <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${story.overlayTop}" />
          <stop offset="58%" stop-color="rgba(255,255,255,0)" />
          <stop offset="100%" stop-color="${story.overlayBottom}" />
        </linearGradient>
        <linearGradient id="b" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="rgba(8,10,15,${bottomBoost})" />
          <stop offset="100%" stop-color="rgba(8,10,15,0)" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#t)" />
      <rect width="100%" height="100%" fill="url(#b)" />
      <rect width="100%" height="100%" fill="url(#v)" />
    </svg>
  `
  );
}

async function buildStyledBuffer(filePath, targetWidth, targetHeight, options = {}) {
  const genres = normalizeGenres(options.genres);
  const analysis =
    options.analysis || (await analyzeFrameCandidate(filePath, { genres }));
  const story = inferColorStory(genres);
  const metadata = analysis.metadata || (await sharp(filePath).metadata());
  const cropBox = computeCropBox(
    metadata.width || targetWidth,
    metadata.height || targetHeight,
    targetWidth,
    targetHeight,
    analysis
  );

  const overlay = buildOverlaySvg(targetWidth, targetHeight, story, options.mode);

  return sharp(filePath)
    .extract(cropBox)
    .resize(targetWidth, targetHeight, {
      fit: "cover",
      position: sharp.strategy.attention,
      withoutEnlargement: false,
    })
    .modulate(story.modulate)
    .linear(story.linear.a, story.linear.b)
    .sharpen({ sigma: options.mode === "poster" ? 1.05 : 0.8 })
    .composite([{ input: overlay, blend: "over" }])
    .jpeg({ quality: options.mode === "poster" ? 88 : 90, mozjpeg: true })
    .toBuffer();
}

async function buildPosterBuffer(filePath, options = {}) {
  return buildStyledBuffer(
    filePath,
    Number(options.width) || 900,
    Number(options.height) || 1350,
    { ...options, mode: "poster" }
  );
}

async function buildBackdropBuffer(filePath, options = {}) {
  return buildStyledBuffer(
    filePath,
    Number(options.width) || 1280,
    Number(options.height) || 720,
    { ...options, mode: "backdrop" }
  );
}

module.exports = {
  analyzeFrameCandidate,
  buildPosterBuffer,
  buildBackdropBuffer,
  inferColorStory,
};
