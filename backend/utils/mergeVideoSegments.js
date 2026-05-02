const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

function toEvenNumber(value, fallback) {
  const num = Math.max(2, parseInt(value, 10) || fallback);
  return num % 2 === 0 ? num : num - 1;
}

function pickMergeCanvas(videoInfos = []) {
  const valid = videoInfos.filter((info) => info?.width && info?.height);
  if (!valid.length) {
    return { width: 1080, height: 1920, mode: "portrait" };
  }

  let portraitCount = 0;
  let landscapeCount = 0;
  let squareCount = 0;

  for (const info of valid) {
    if (info.height > info.width) portraitCount += 1;
    else if (info.width > info.height) landscapeCount += 1;
    else squareCount += 1;
  }

  if (portraitCount >= landscapeCount && portraitCount >= squareCount) {
    return { width: 1080, height: 1920, mode: "portrait" };
  }

  if (landscapeCount >= portraitCount && landscapeCount >= squareCount) {
    return { width: 1920, height: 1080, mode: "landscape" };
  }

  return { width: 1080, height: 1080, mode: "square" };
}

function buildAspectPadFilter(width, height, { allowUpscale = false } = {}) {
  const safeWidth = toEvenNumber(width, 1080);
  const safeHeight = toEvenNumber(height, 1920);
  const scaleWidth = allowUpscale ? `${safeWidth}` : `min(${safeWidth},iw)`;
  const scaleHeight = allowUpscale ? `${safeHeight}` : `min(${safeHeight},ih)`;

  return [
    `scale=w='${scaleWidth}':h='${scaleHeight}':force_original_aspect_ratio=decrease`,
    `pad=${safeWidth}:${safeHeight}:(ow-iw)/2:(oh-ih)/2:color=black`,
    'setsar=1',
  ].join(',');
}

/**
 * Ghép nhiều video nhỏ thành video dài hơn
 * @param {string[]} inputVideos - Mảng đường dẫn đến các video cần ghép
 * @param {string} outputPath - Đường dẫn file output
 * @param {Object} options - Tuỳ chọn
 * @returns {Promise<{outputPath: string, duration: number}>}
 */
async function mergeVideos(inputVideos, outputPath, options = {}) {
  const {
    videoCodec = 'libx264',
    audioCodec = 'aac',
    preset = 'ultrafast',
    crf = 25,
    scale = null,
    withAudio = true,
    // copyMode: ghép nhanh không re-encode (dùng khi video sẽ được encode lại sau)
    copyMode = false,
    threads = 2,
  } = options;

  if (!inputVideos || inputVideos.length === 0) {
    throw new Error('inputVideos khong duoc de trong');
  }

  const videoInfos = await Promise.all(
    inputVideos.map(async (videoPath) => {
      try {
        return await getVideoInfo(videoPath);
      } catch (err) {
        console.warn(`[MERGE] Failed to probe ${path.basename(videoPath)}:`, err.message);
        return null;
      }
    })
  );

  const validInfos = videoInfos.filter(Boolean);
  const firstInfo = validInfos[0] || null;
  const hasMixedGeometry = validInfos.some(
    (info) =>
      firstInfo &&
      (info.width !== firstInfo.width || info.height !== firstInfo.height)
  );
  const hasMixedOrientation = validInfos.some((info) => {
    if (!firstInfo) return false;
    return (info.height > info.width) !== (firstInfo.height > firstInfo.width);
  });
  const normalizeGeometry = hasMixedGeometry || hasMixedOrientation;
  const mergeCanvas = pickMergeCanvas(validInfos);
  const videoFilter = normalizeGeometry
    ? buildAspectPadFilter(mergeCanvas.width, mergeCanvas.height)
    : scale
      ? `scale=${scale},setsar=1`
      : 'setsar=1';

  return new Promise((resolve, reject) => {
    if (!inputVideos || inputVideos.length === 0) {
      return reject(new Error('inputVideos không được để trống'));
    }

    if (inputVideos.length === 1) {
      ffmpeg(inputVideos[0])
        .outputOptions(['-c copy'])
        .output(outputPath)
        .on('end', () => {
          getVideoDuration(outputPath)
            .then(duration => resolve({ outputPath, duration, merged: false }))
            .catch(() => resolve({ outputPath, duration: 0, merged: false }));
        })
        .on('error', reject)
        .run();
      return;
    }

    console.log(`[MERGE] Bắt đầu ghép ${inputVideos.length} video (mode: ${copyMode ? 'copy' : 'encode'})...`);

    const listFile = path.join(path.dirname(outputPath), `concat_list_${Date.now()}.txt`);
    // Dùng forward slash để ffmpeg concat demuxer đọc được trên Windows
    const listContent = inputVideos
      .map(v => `file '${v.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
      .join('\n');

    fs.writeFileSync(listFile, listContent, 'utf8');

    const cleanList = () => {
      try { fs.unlinkSync(listFile); } catch (e) {}
    };

    const copyOpts = [
      '-c copy',
      '-movflags', '+faststart',
    ];

    const encodeOpts = [
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-c:v', videoCodec,
      '-preset', preset,
      '-crf', String(crf),
      '-vf', videoFilter,
      '-pix_fmt', 'yuv420p',
      '-threads', String(threads),
      ...(withAudio ? ['-c:a', audioCodec, '-b:a', '128k', '-ar', '48000'] : ['-an']),
      '-movflags', '+faststart',
    ];

    const fallbackEncodeOpts = [
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '26',
      '-vf', videoFilter,
      '-pix_fmt', 'yuv420p',
      '-threads', '2',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '48000',
      '-movflags', '+faststart',
    ];

    const runWith = (opts, onDone, onFail) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(opts)
        .output(outputPath)
        .on('start', cmd => console.log('[MERGE] CMD:', cmd.substring(0, 200)))
        .on('end', onDone)
        .on('error', onFail)
        .run();
    };

    const onSuccess = () => {
      cleanList();
      console.log('[MERGE] Ghép video hoàn thành:', outputPath);
      getVideoDuration(outputPath)
        .then(duration => resolve({ outputPath, duration, merged: true, videoCount: inputVideos.length }))
        .catch(() => resolve({ outputPath, duration: 0, merged: true, videoCount: inputVideos.length }));
    };

    if (copyMode && !normalizeGeometry) {
      // Thử copy mode trước (nhanh, không tốn CPU)
      // Nếu fail (codec khác nhau) thì fallback sang re-encode ultrafast
      runWith(copyOpts, onSuccess, (err) => {
        console.warn('[MERGE] Copy mode thất bại, chuyển sang re-encode:', err.message);
        try {
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (e) {}
        runWith(fallbackEncodeOpts, onSuccess, (err2) => {
          cleanList();
          reject(err2);
        });
      });
    } else {
      if (normalizeGeometry) {
        console.log(
          `[MERGE] Normalize geometry to ${mergeCanvas.width}x${mergeCanvas.height} (${mergeCanvas.mode})`
        );
      }
      runWith(encodeOpts, onSuccess, (err) => {
        cleanList();
        reject(err);
      });
    }
  });
}

/**
 * Lấy thời lượng video
 */
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Lấy thông tin video (duration, width, height, fps)
 */
function getVideoInfo(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        fps: videoStream?.r_frame_rate ?
          parseFloat(videoStream.r_frame_rate.split('/')[0]) /
          parseFloat(videoStream.r_frame_rate.split('/')[1]) : 0,
        hasAudio: !!audioStream,
        videoCodec: videoStream?.codec_name || 'unknown',
        audioCodec: audioStream?.codec_name || 'unknown',
        size: metadata.format.size || 0,
        bitrate: metadata.format.bit_rate || 0,
      });
    });
  });
}

/**
 * Phân nhóm các video thành các segment có thời lượng xấp xỉ nhau
 */
function groupVideosByDuration(videos, targetDuration = 900) {
  const groups = [];
  let currentGroup = [];
  let currentDuration = 0;

  for (const video of videos) {
    if (video.duration >= targetDuration * 1.5) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup.map(v => v.path));
        currentGroup = [];
        currentDuration = 0;
      }
      groups.push([video.path]);
      continue;
    }

    if (currentDuration + video.duration > targetDuration && currentGroup.length > 0) {
      groups.push(currentGroup.map(v => v.path));
      currentGroup = [];
      currentDuration = 0;
    }

    currentGroup.push(video);
    currentDuration += video.duration;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup.map(v => v.path));
  }

  return groups;
}

/**
 * Sắp xếp video theo thứ tự (dựa trên tên file hoặc thời gian tạo)
 */
function sortVideos(videoPaths, sortBy = 'name') {
  return [...videoPaths].sort((a, b) => {
    if (sortBy === 'name') {
      return path.basename(a).localeCompare(path.basename(b), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    } else if (sortBy === 'time') {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statA.mtimeMs - statB.mtimeMs;
    }
    return 0;
  });
}

/**
 * Tìm tất cả video files trong folder
 */
function findVideoFiles(folderPath) {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];
  const files = fs.readdirSync(folderPath);

  return files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return videoExtensions.includes(ext);
    })
    .map(file => path.join(folderPath, file));
}

/**
 * Xoá các file/folder cũ trong thư mục tmp
 * @param {string} tmpDir - Đường dẫn thư mục tmp
 * @param {number} maxAgeHours - Xoá file cũ hơn N giờ (mặc định 6 giờ)
 */
function cleanOldTmpFiles(tmpDir, maxAgeHours = 6) {
  try {
    if (!fs.existsSync(tmpDir)) return;
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    const entries = fs.readdirSync(tmpDir);
    let deleted = 0;
    for (const entry of entries) {
      // Chỉ xoá file/folder liên quan đến merge/upload (không xoá file khác)
      if (!/^[0-9a-f]{24}-/.test(entry) && !/^concat_list_/.test(entry)) continue;
      const fullPath = path.join(tmpDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > maxAge) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          deleted++;
        }
      } catch (e) {}
    }
    if (deleted > 0) console.log(`[CLEANUP] Đã xoá ${deleted} file/folder cũ trong tmp`);
  } catch (e) {
    console.warn('[CLEANUP] cleanOldTmpFiles error:', e.message);
  }
}

module.exports = {
  mergeVideos,
  getVideoInfo,
  getVideoDuration,
  groupVideosByDuration,
  sortVideos,
  findVideoFiles,
  cleanOldTmpFiles,
};
