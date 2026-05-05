export function normalizeImage(url) {
  return typeof url === "string" && url.trim() ? url.trim() : "";
}

function getTimelineSource(value = null) {
  if (value?.previewTimeline) return value.previewTimeline;
  return value || {};
}

function getPreviewItems(source = null) {
  const timeline = getTimelineSource(source);
  const raw = Array.isArray(timeline?.items) ? timeline.items : [];

  return raw
    .map((item, index) => ({
      second: Number(item?.second ?? item?.time ?? item?.at ?? 0),
      url: normalizeImage(item?.url),
      frameIndex: Number.isFinite(Number(item?.frameIndex))
        ? Number(item.frameIndex)
        : index,
    }))
    .sort((a, b) => a.second - b.second);
}

function getSpriteMeta(source = null) {
  const timeline = getTimelineSource(source);
  const spriteUrl = normalizeImage(timeline?.spriteUrl);
  const cols = Math.max(1, Number(timeline?.cols) || 0);
  const rows = Math.max(1, Number(timeline?.rows) || 0);
  const frameWidth = Math.max(1, Number(timeline?.frameWidth) || 0);
  const frameHeight = Math.max(1, Number(timeline?.frameHeight) || 0);

  if (!spriteUrl || !cols || !rows || !frameWidth || !frameHeight) {
    return null;
  }

  return {
    spriteUrl,
    cols,
    rows,
    frameWidth,
    frameHeight,
  };
}

function buildRatios(count = 4) {
  const safeCount = Math.max(1, Number(count) || 1);

  if (safeCount === 1) return [0.5];
  if (safeCount === 3) return [0.15, 0.48, 0.8];
  if (safeCount === 4) return [0.08, 0.34, 0.62, 0.88];

  return Array.from({ length: safeCount }, (_item, index) => {
    const ratio = index / Math.max(1, safeCount - 1);
    return 0.08 + ratio * 0.84;
  });
}

function pickSampledItems(items = [], count = 4) {
  if (!items.length) return [];

  const safeCount = Math.max(1, Number(count) || 1);
  if (items.length <= safeCount) return items.slice(0, safeCount);

  return buildRatios(safeCount)
    .map((ratio) => {
      const index = Math.min(
        items.length - 1,
        Math.floor((items.length - 1) * ratio)
      );
      return items[index];
    })
    .filter((item, index, arr) => {
      const key = `${item.second}-${item.frameIndex}-${item.url}`;
      return arr.findIndex((entry) => {
        const entryKey = `${entry.second}-${entry.frameIndex}-${entry.url}`;
        return entryKey === key;
      }) === index;
    })
    .slice(0, safeCount);
}

function buildFrameDescriptor(item, sprite) {
  if (!item) return null;

  if (sprite) {
    return {
      type: "sprite",
      second: item.second,
      frameIndex: Math.max(0, Number(item.frameIndex) || 0),
      spriteUrl: sprite.spriteUrl,
      cols: sprite.cols,
      rows: sprite.rows,
      frameWidth: sprite.frameWidth,
      frameHeight: sprite.frameHeight,
    };
  }

  const url = normalizeImage(item.url);
  if (!url) return null;

  return {
    type: "image",
    second: item.second,
    url,
  };
}

export function getPreviewFrames(source = null, count = 4) {
  const items = getPreviewItems(source);
  if (!items.length) return [];

  const sprite = getSpriteMeta(source);

  return pickSampledItems(items, count)
    .map((item) => buildFrameDescriptor(item, sprite))
    .filter(Boolean);
}

export function getAllPreviewFrames(source = null) {
  const items = getPreviewItems(source);
  if (!items.length) return [];

  const sprite = getSpriteMeta(source);

  return items
    .map((item) => buildFrameDescriptor(item, sprite))
    .filter(Boolean);
}

export function getPreviewFrameAtTime(source = null, timeInSeconds = 0) {
  const items = getPreviewItems(source);
  if (!items.length) return null;

  let chosen = items[0];

  for (const item of items) {
    if (item.second <= timeInSeconds) {
      chosen = item;
    } else {
      break;
    }
  }

  return buildFrameDescriptor(chosen, getSpriteMeta(source));
}

export function getPreviewAssetUrl(frame) {
  if (typeof frame === "string") return normalizeImage(frame);
  if (!frame) return "";
  return frame.type === "sprite"
    ? normalizeImage(frame.spriteUrl)
    : normalizeImage(frame.url);
}

export function getPreviewFrameStyle(frame, options = {}) {
  const width = options.width;
  const height = options.height;
  const baseStyle = {
    width,
    height,
    backgroundColor: "#0c0f17",
    backgroundRepeat: "no-repeat",
  };

  if (typeof frame === "string") {
    return {
      ...baseStyle,
      backgroundImage: `url(${frame})`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    };
  }

  if (!frame) return baseStyle;

  if (frame.type === "sprite") {
    const cols = Math.max(1, Number(frame.cols) || 1);
    const rows = Math.max(1, Number(frame.rows) || 1);
    const frameWidth = Math.max(1, Number(frame.frameWidth) || 1);
    const frameHeight = Math.max(1, Number(frame.frameHeight) || 1);
    const frameIndex = Math.max(0, Number(frame.frameIndex) || 0);
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);

    return {
      ...baseStyle,
      backgroundImage: `url(${frame.spriteUrl})`,
      backgroundPosition: `-${col * frameWidth}px -${row * frameHeight}px`,
      backgroundSize: `${frameWidth * cols}px ${frameHeight * rows}px`,
    };
  }

  return {
    ...baseStyle,
    backgroundImage: `url(${frame.url})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}
