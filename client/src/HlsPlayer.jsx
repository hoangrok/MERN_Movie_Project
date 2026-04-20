import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  }

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function HlsPlayer({
  src,
  poster = "",
  title = "Video",
  autoPlay = false,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const hideTimerRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  const progressPercent = useMemo(() => {
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const bufferedPercent = useMemo(() => {
    if (!duration) return 0;
    return (buffered / duration) * 100;
  }, [buffered, duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsReady(false);
    setLevels([]);
    setCurrentLevel(-1);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setIsReady(true);
    };

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);

      try {
        if (video.buffered.length > 0) {
          setBuffered(video.buffered.end(video.buffered.length - 1));
        }
      } catch {
        setBuffered(0);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("progress", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const parsedLevels = (data?.levels || hls.levels || []).map(
          (level, index) => ({
            index,
            height: level.height,
            width: level.width,
            bitrate: level.bitrate,
            label: level.height ? `${level.height}p` : `Level ${index + 1}`,
          })
        );

        setLevels(parsedLevels);
        setCurrentLevel(hls.currentLevel ?? -1);

        if (autoPlay) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else {
      video.src = src;
    }

    if (autoPlay) {
      video.play().catch(() => {});
    }

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("progress", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying]);

  const resetHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowControls(true);

    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2400);
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play().catch(() => {});
    } else {
      video.pause();
    }
    resetHideTimer();
  };

  const seekBy = (delta) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(
      0,
      Math.min(video.duration || 0, video.currentTime + delta)
    );
    resetHideTimer();
  };

  const onSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const value = Number(e.target.value);
    video.currentTime = value;
    setCurrentTime(value);
    resetHideTimer();
  };

  const onVolumeInput = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const value = Number(e.target.value);
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setIsMuted(value === 0);
    resetHideTimer();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    resetHideTimer();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen?.().catch(() => {});
    } else {
      await document.exitFullscreen?.().catch(() => {});
    }
    resetHideTimer();
  };

  const changeQuality = (levelIndex) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
    resetHideTimer();
  };

  const setAutoQuality = () => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = -1;
    setCurrentLevel(-1);
    resetHideTimer();
  };

  return (
    <div
      ref={containerRef}
      className={`hls-player-shell ${
        showControls ? "controls-visible" : "controls-hidden"
      }`}
      onMouseMove={resetHideTimer}
      onMouseEnter={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="hls-player-video"
        poster={poster}
        playsInline
        preload="metadata"
        title={title}
        onClick={togglePlay}
      />

      {!isPlaying && (
        <button
          className="hls-center-play"
          onClick={togglePlay}
          type="button"
          aria-label="Phát video"
        >
          ▶
        </button>
      )}

      <div className="hls-player-top">
        <div className="hls-player-title-wrap">
          <div className="hls-player-title">{title}</div>
          {!isReady ? (
            <div className="hls-player-status">Đang tải video...</div>
          ) : null}
        </div>

        <div className="hls-quality-box">
          <button
            type="button"
            className={`hls-quality-btn ${currentLevel === -1 ? "active" : ""}`}
            onClick={setAutoQuality}
          >
            Auto
          </button>

          {levels.map((level) => (
            <button
              key={level.index}
              type="button"
              className={`hls-quality-btn ${
                currentLevel === level.index ? "active" : ""
              }`}
              onClick={() => changeQuality(level.index)}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hls-player-bottom">
        <div className="hls-timeline-wrap">
          <div className="hls-timeline-rail">
            <div
              className="hls-timeline-buffered"
              style={{ width: `${bufferedPercent}%` }}
            />
            <div
              className="hls-timeline-progress"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={onSeek}
            className="hls-timeline-input"
            aria-label="Tiến độ video"
          />
        </div>

        <div className="hls-controls-row">
          <div className="hls-controls-left">
            <button
              type="button"
              className="hls-ctrl-btn primary"
              onClick={togglePlay}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>

            <button
              type="button"
              className="hls-ctrl-btn"
              onClick={() => seekBy(-5)}
            >
              -5s
            </button>

            <button
              type="button"
              className="hls-ctrl-btn"
              onClick={() => seekBy(5)}
            >
              +5s
            </button>

            <button
              type="button"
              className="hls-ctrl-btn"
              onClick={toggleMute}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={onVolumeInput}
              className="hls-volume-input"
              aria-label="Âm lượng"
            />

            <div className="hls-time-text">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="hls-controls-right">
            <button
              type="button"
              className="hls-ctrl-btn"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? "⤢" : "⛶"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}