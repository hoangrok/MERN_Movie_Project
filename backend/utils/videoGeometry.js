function toEvenNumber(value, fallback = 2) {
  const num = Math.max(2, parseInt(value, 10) || fallback);
  return num % 2 === 0 ? num : num - 1;
}

function normalizeRotation(value = 0) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 0;
  const normalized = ((Math.round(raw / 90) * 90) % 360 + 360) % 360;
  return [0, 90, 180, 270].includes(normalized) ? normalized : 0;
}

function getStreamRotation(stream = {}) {
  const sideDataRotation = Array.isArray(stream?.side_data_list)
    ? stream.side_data_list.find((item) =>
        Number.isFinite(Number(item?.rotation))
      )?.rotation
    : undefined;

  return normalizeRotation(
    sideDataRotation ?? stream?.tags?.rotate ?? stream?.rotation ?? 0
  );
}

function getDisplayDimensions(width, height, rotation = 0) {
  const rawWidth = Number(width) || 0;
  const rawHeight = Number(height) || 0;
  const normalizedRotation = normalizeRotation(rotation);

  if (normalizedRotation === 90 || normalizedRotation === 270) {
    return {
      width: rawHeight,
      height: rawWidth,
    };
  }

  return {
    width: rawWidth,
    height: rawHeight,
  };
}

function getVideoGeometryFromProbe(probe = {}) {
  const stream = Array.isArray(probe?.streams)
    ? probe.streams.find((item) => item?.codec_type === "video")
    : null;

  if (!stream) {
    return {
      width: 0,
      height: 0,
      displayWidth: 0,
      displayHeight: 0,
      rotation: 0,
    };
  }

  const width = Number(stream.width) || 0;
  const height = Number(stream.height) || 0;
  const rotation = getStreamRotation(stream);
  const display = getDisplayDimensions(width, height, rotation);

  return {
    width,
    height,
    displayWidth: display.width,
    displayHeight: display.height,
    rotation,
  };
}

function buildRotationFilter(rotation = 0) {
  switch (normalizeRotation(rotation)) {
    case 90:
      return "transpose=1";
    case 180:
      return "hflip,vflip";
    case 270:
      return "transpose=2";
    default:
      return "";
  }
}

function buildGeometryFilter({
  rotation = 0,
  targetWidth = 0,
  targetHeight = 0,
  pad = false,
  allowUpscale = false,
  includeFormat = true,
} = {}) {
  const filters = [];
  const rotationFilter = buildRotationFilter(rotation);

  if (rotationFilter) {
    filters.push(rotationFilter);
  }

  if (targetWidth && targetHeight) {
    const safeWidth = toEvenNumber(targetWidth, 1080);
    const safeHeight = toEvenNumber(targetHeight, 1920);
    const scaleWidth = allowUpscale ? `${safeWidth}` : `min(${safeWidth},iw)`;
    const scaleHeight = allowUpscale ? `${safeHeight}` : `min(${safeHeight},ih)`;

    filters.push(
      `scale=w='${scaleWidth}':h='${scaleHeight}':force_original_aspect_ratio=decrease`
    );

    if (pad) {
      filters.push(
        `pad=${safeWidth}:${safeHeight}:(ow-iw)/2:(oh-ih)/2:color=black`
      );
    }
  } else {
    filters.push("scale=trunc(iw/2)*2:trunc(ih/2)*2");
  }

  filters.push("setsar=1");

  if (includeFormat) {
    filters.push("format=yuv420p");
  }

  return filters.join(",");
}

module.exports = {
  getStreamRotation,
  getDisplayDimensions,
  getVideoGeometryFromProbe,
  buildGeometryFilter,
  toEvenNumber,
};
