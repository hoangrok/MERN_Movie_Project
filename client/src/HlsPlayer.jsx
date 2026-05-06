import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function HlsPlayer({
  src,
  poster = "",
  title = "Video",
  autoPlay = false,
  aspectRatio = "16 / 9",
}) {
  const videoRef     = useRef(null);
  const containerRef = useRef(null);
  const hlsRef       = useRef(null);
  const hideTimerRef = useRef(null);

  const [isReady, setIsReady]         = useState(false);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [duration, setDuration]       = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered]       = useState(0);
  const [volume, setVolume]           = useState(1);
  const [isMuted, setIsMuted]         = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [levels, setLevels]           = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPiP, setIsPiP]             = useState(false);
  const [seekHint, setSeekHint]       = useState(""); // "+5s" / "-5s" feedback
  const seekHintTimer                 = useRef(null);

  const progressPercent = useMemo(() => {
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const bufferedPercent = useMemo(() => {
    if (!duration) return 0;
    return (buffered / duration) * 100;
  }, [buffered, duration]);

  // ── HLS setup ──────────────────────────────────────────────
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

    const updateBuffered = () => {
      setCurrentTime(video.currentTime || 0);
      try {
        if (video.buffered.length > 0) {
          setBuffered(video.buffered.end(video.buffered.length - 1));
        }
      } catch {
        setBuffered(0);
      }
    };

    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };
    const onPiPEnter = () => setIsPiP(true);
    const onPiPLeave = () => setIsPiP(false);

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", updateBuffered);
    video.addEventListener("progress", updateBuffered);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("enterpictureinpicture", onPiPEnter);
    video.addEventListener("leavepictureinpicture", onPiPLeave);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 60,
        maxMaxBufferLength: 240,
        maxBufferSize: 80 * 1024 * 1024,
        backBufferLength: 30,
        startLevel: -1,
        abrEwmaDefaultEstimate: 1_500_000,
        maxBufferHole: 0.5,
        nudgeMaxRetry: 5,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const parsedLevels = (data?.levels || hls.levels || []).map((level, index) => ({
          index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          label: level.height ? `${level.height}p` : `Level ${index + 1}`,
        }));
        setLevels(parsedLevels);
        setCurrentLevel(hls.currentLevel ?? -1);
        if (autoPlay) video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => setCurrentLevel(data.level));

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data?.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else hls.destroy();
        }
      });
    } else {
      video.src = src;
    }

    if (autoPlay) video.play().catch(() => {});

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", updateBuffered);
      video.removeEventListener("progress", updateBuffered);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("enterpictureinpicture", onPiPEnter);
      video.removeEventListener("leavepictureinpicture", onPiPLeave);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [src, autoPlay]);

  // ── Fullscreen change ───────────────────────────────────────
  useEffect(() => {
    const onFSChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  // ── Auto-hide controls ──────────────────────────────────────
  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [isPlaying]);

  // ── Keyboard shortcuts (global, skip when typing) ───────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;
      if (document.activeElement?.isContentEditable) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          video.paused ? video.play().catch(() => {}) : video.pause();
          resetHideTimer();
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          showSeekHint("-5s");
          resetHideTimer();
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          showSeekHint("+5s");
          resetHideTimer();
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, Math.round((video.volume + 0.1) * 10) / 10);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, Math.round((video.volume - 0.1) * 10) / 10);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          video.muted = !video.muted;
          break;
        default:
          if (e.key >= "0" && e.key <= "9") {
            e.preventDefault();
            video.currentTime = ((video.duration || 0) * Number(e.key)) / 10;
            resetHideTimer();
          }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── Helpers ─────────────────────────────────────────────────
  const resetHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowControls(true);
    if (videoRef.current && !videoRef.current.paused) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 2400);
    }
  };

  const showSeekHint = (text) => {
    setSeekHint(text);
    if (seekHintTimer.current) clearTimeout(seekHintTimer.current);
    seekHintTimer.current = setTimeout(() => setSeekHint(""), 800);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? await video.play().catch(() => {}) : video.pause();
    resetHideTimer();
  };

  const seekBy = (delta) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
    showSeekHint(delta > 0 ? `+${delta}s` : `${delta}s`);
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
    resetHideTimer();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    resetHideTimer();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) await container.requestFullscreen?.().catch(() => {});
    else await document.exitFullscreen?.().catch(() => {});
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

  const cycleSpeed = () => {
    const video = videoRef.current;
    if (!video) return;
    const idx = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    video.playbackRate = next;
    setPlaybackRate(next);
    resetHideTimer();
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
    } else {
      await video.requestPictureInPicture().catch(() => {});
    }
    resetHideTimer();
  };

  return (
    <div
      ref={containerRef}
      className={`hls-player-shell ${showControls ? "controls-visible" : "controls-hidden"}`}
      style={{ "--player-aspect-ratio": aspectRatio }}
      onMouseMove={resetHideTimer}
      onMouseEnter={resetHideTimer}
      onMouseLeave={() => videoRef.current && !videoRef.current.paused && setShowControls(false)}
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

      {/* Seek feedback */}
      {seekHint && (
        <div className="hls-seek-hint">{seekHint}</div>
      )}

      {!isPlaying && (
        <button className="hls-center-play" onClick={togglePlay} type="button" aria-label="Phát video">
          ▶
        </button>
      )}

      <div className="hls-player-top">
        <div className="hls-player-title-wrap">
          <div className="hls-player-title">{title}</div>
          {!isReady && <div className="hls-player-status">Đang tải video...</div>}
        </div>

        <div className="hls-quality-box">
          <button type="button" className={`hls-quality-btn ${currentLevel === -1 ? "active" : ""}`} onClick={setAutoQuality}>
            Auto
          </button>
          {levels.map((level) => (
            <button key={level.index} type="button"
              className={`hls-quality-btn ${currentLevel === level.index ? "active" : ""}`}
              onClick={() => changeQuality(level.index)}>
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hls-player-bottom">
        <div className="hls-timeline-wrap">
          <div className="hls-timeline-rail">
            <div className="hls-timeline-buffered" style={{ width: `${bufferedPercent}%` }} />
            <div className="hls-timeline-progress" style={{ width: `${progressPercent}%` }} />
          </div>
          <input
            type="range" min={0} max={duration || 0} step="0.1"
            value={currentTime} onChange={onSeek}
            className="hls-timeline-input" aria-label="Tiến độ video"
          />
        </div>

        <div className="hls-controls-row">
          <div className="hls-controls-left">
            <button type="button" className="hls-ctrl-btn primary" onClick={togglePlay}>
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button type="button" className="hls-ctrl-btn" onClick={() => seekBy(-5)} title="← hoặc J">-5s</button>
            <button type="button" className="hls-ctrl-btn" onClick={() => seekBy(5)}  title="→ hoặc L">+5s</button>
            <button type="button" className="hls-ctrl-btn" onClick={toggleMute} title="M">
              {isMuted ? "🔇" : "🔊"}
            </button>
            <input
              type="range" min={0} max={1} step="0.01"
              value={isMuted ? 0 : volume} onChange={onVolumeInput}
              className="hls-volume-input" aria-label="Âm lượng"
            />
            <div className="hls-time-text">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="hls-controls-right">
            <button type="button" className="hls-ctrl-btn hls-speed-btn" onClick={cycleSpeed} title="Tốc độ phát">
              {playbackRate === 1 ? "1×" : `${playbackRate}×`}
            </button>
            {document.pictureInPictureEnabled && (
              <button type="button" className={`hls-ctrl-btn ${isPiP ? "active" : ""}`} onClick={togglePiP} title="Picture-in-Picture">
                ⧉
              </button>
            )}
            <button type="button" className="hls-ctrl-btn" onClick={toggleFullscreen} title="F">
              {isFullscreen ? "⤢" : "⛶"}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard shortcut hint — show on first render for 3s */}
      <div className="hls-kb-hint">
        Space: play/pause &nbsp;·&nbsp; ← → tua 5s &nbsp;·&nbsp; ↑↓ âm lượng &nbsp;·&nbsp; F: toàn màn hình &nbsp;·&nbsp; M: tắt tiếng &nbsp;·&nbsp; 0-9: nhảy %
      </div>
    </div>
  );
}
