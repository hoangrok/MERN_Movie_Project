"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { getContinue, saveContinue } from "@/lib/continue";
import { getSignedStreamUrl } from "@/lib/api";

export default function AdultPlayer({ movie }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const wrapRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverLeft, setHoverLeft] = useState(0);

  useEffect(() => {
    const continued = getContinue();
    const current = continued.find((item) => item._id === movie?._id);

    if (current?.currentTime && current.currentTime > 0) {
      setResumeTime(current.currentTime);
    } else {
      setResumeTime(0);
    }
  }, [movie?._id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movie?._id) return;

    let mounted = true;

    async function setupPlayer() {
      try {
        const signedUrl = await getSignedStreamUrl(movie._id);
        if (!mounted || !signedUrl) return;

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        setIsReady(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setBufferedPercent(0);
        setHasStarted(false);

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = signedUrl;
          if (mounted) setIsReady(true);
        } else if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });

          hls.loadSource(signedUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (mounted) setIsReady(true);
          });

          hlsRef.current = hls;
        } else {
          video.src = signedUrl;
          if (mounted) setIsReady(true);
        }
      } catch (err) {
        console.error("setupPlayer error:", err);
      }
    }

    setupPlayer();

    return () => {
      mounted = false;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [movie?._id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    video.volume = volume;
    video.muted = isMuted;

    const handleLoadedMetadata = () => {
      const vw = Number(video.videoWidth || 0);
      const vh = Number(video.videoHeight || 0);

      if (vw > 0 && vh > 0) {
        setIsPortrait(vh > vw);
      }

      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
      setDuration(nextDuration);

      if (
        resumeTime > 0 &&
        Number.isFinite(video.duration) &&
        resumeTime < video.duration - 3
      ) {
        video.currentTime = resumeTime;
        setCurrentTime(resumeTime);
      }
    };

    let lastSaved = 0;

    const handleTimeUpdate = () => {
      const now = Date.now();
      setCurrentTime(video.currentTime || 0);

      if (now - lastSaved >= 5000) {
        lastSaved = now;
        saveContinue(movie, video.currentTime || 0, video.duration || 0);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      saveContinue(movie, video.currentTime || 0, video.duration || 0);
      setShowControls(true);
      clearHideControlsTimer();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      saveContinue(movie, video.duration || 0, video.duration || 0);
      setShowControls(true);
      clearHideControlsTimer();
    };

    const handlePlay = () => {
      setHasStarted(true);
      setIsPlaying(true);
      startHideControlsTimer();
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    const handleProgress = () => {
      try {
        if (!video.duration || !video.buffered?.length) {
          setBufferedPercent(0);
          return;
        }

        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const percent = Math.min(100, (bufferedEnd / video.duration) * 100);
        setBufferedPercent(percent);
      } catch {
        setBufferedPercent(0);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("durationchange", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("waiting", handleProgress);
    video.addEventListener("canplay", handleProgress);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("durationchange", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("waiting", handleProgress);
      video.removeEventListener("canplay", handleProgress);
    };
  }, [isReady, movie, resumeTime, volume, isMuted]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fsElement =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement;

      setIsFullscreen(!!fsElement);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("msfullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("msfullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return () => clearHideControlsTimer();
  }, []);

  const clearHideControlsTimer = () => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  };

  const startHideControlsTimer = () => {
    clearHideControlsTimer();
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2200);
  };

  const revealControls = () => {
    setShowControls(true);
    if (isPlaying) {
      startHideControlsTimer();
    }
  };

  const handleBigPlay = async () => {
    try {
      const video = videoRef.current;
      if (!video) return;
      await video.play();
      setHasStarted(true);
      setShowControls(true);
      startHideControlsTimer();
    } catch (err) {
      console.error("play error:", err);
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
        setHasStarted(true);
      } else {
        video.pause();
      }
    } catch (err) {
      console.error("togglePlay error:", err);
    }
  };

  const seekBy = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min((video.duration || 0), (video.currentTime || 0) + seconds));
    video.currentTime = next;
    setCurrentTime(next);
    revealControls();
  };

  const handleProgressChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const next = Number(e.target.value || 0);
    video.currentTime = next;
    setCurrentTime(next);
    revealControls();
  };

  const handleProgressHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const time = ratio * (duration || 0);
    setHoverTime(time);
    setHoverLeft(ratio * rect.width);
  };

  const handleProgressLeave = () => {
    setHoverTime(null);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    const next = Number(e.target.value || 0);
    setVolume(next);

    if (!video) return;
    video.volume = next;
    video.muted = next === 0;
    setIsMuted(next === 0);
    revealControls();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted && video.volume > 0 ? true : false;
    video.muted = nextMuted;
    setIsMuted(nextMuted);

    if (!nextMuted && video.volume === 0) {
      video.volume = 0.6;
      setVolume(0.6);
    }

    revealControls();
  };

  const toggleFullscreen = async () => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    try {
      if (!document.fullscreenElement) {
        if (wrap.requestFullscreen) await wrap.requestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
      }
    } catch (err) {
      console.error("fullscreen error:", err);
    }
  };

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="playerWrap">
      {resumeTime > 0 ? (
        <div className="resumeText">Tiếp tục từ {formatTime(resumeTime)}</div>
      ) : null}

      <div
        ref={wrapRef}
        className={`playerShell ${isFullscreen ? "isFullscreen" : ""}`}
        style={{
          maxWidth: isPortrait ? 560 : 1080,
        }}
        onMouseMove={revealControls}
        onMouseLeave={() => {
          setHoverTime(null);
          if (isPlaying) startHideControlsTimer();
        }}
      >
        <div className="playerStage">
          {!hasStarted ? (
            <button
              type="button"
              className="bigPlay"
              onClick={handleBigPlay}
              aria-label="Phát video"
            >
              <span className="bigPlay__circle">
                <span className="bigPlay__triangle">▶</span>
              </span>
              <span className="bigPlay__label">Phát ngay</span>
            </button>
          ) : null}

          <div className={`playerOverlay ${hasStarted ? "isHidden" : ""}`} />

          <video
            ref={videoRef}
            controls={false}
            autoPlay
            playsInline
            poster={movie?.backdrop || movie?.poster || ""}
            className="playerVideo"
            onClick={togglePlay}
          />

          <div className={`playerUi ${showControls ? "isVisible" : ""}`}>
            <div className="playerUi__top">
              <div className="playerUi__titleWrap">
                <div className="playerUi__title line-clamp-1">{movie?.title}</div>
              </div>
            </div>

            <div className="playerUi__bottom">
              <div
                className="playerUi__timelineWrap"
                onMouseMove={handleProgressHover}
                onMouseLeave={handleProgressLeave}
              >
                {hoverTime !== null ? (
                  <div
                    className="playerUi__tooltip"
                    style={{ left: hoverLeft }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                ) : null}

                <div className="playerUi__timelineBars">
                  <div
                    className="playerUi__timelineBuffered"
                    style={{ width: `${bufferedPercent}%` }}
                  />
                  <div
                    className="playerUi__timelinePlayed"
                    style={{ width: `${playedPercent}%` }}
                  />
                </div>

                <input
                  ref={progressRef}
                  type="range"
                  min={0}
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="playerUi__range"
                  aria-label="Tua video"
                />
              </div>

              <div className="playerUi__controls">
                <div className="playerUi__left">
                  <button
                    type="button"
                    className="playerBtn playerBtn--primary"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Tạm dừng" : "Phát"}
                  >
                    {isPlaying ? "❚❚" : "▶"}
                  </button>

                  <button
                    type="button"
                    className="playerBtn"
                    onClick={() => seekBy(-10)}
                    aria-label="Lùi 10 giây"
                  >
                    ↺10
                  </button>

                  <button
                    type="button"
                    className="playerBtn"
                    onClick={() => seekBy(10)}
                    aria-label="Tới 10 giây"
                  >
                    10↻
                  </button>

                  <div className="playerUi__time">
                    <span>{formatTime(currentTime)}</span>
                    <span className="playerUi__timeSep">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="playerUi__right">
                  <div className="playerUi__volumeWrap">
                    <button
                      type="button"
                      className="playerBtn"
                      onClick={toggleMute}
                      aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                    >
                      {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                    </button>

                    <input
                      ref={volumeRef}
                      type="range"
                      min={0}
                      max={1}
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="playerUi__volume"
                      aria-label="Âm lượng"
                    />
                  </div>

                  <button
                    type="button"
                    className="playerBtn"
                    onClick={toggleFullscreen}
                    aria-label="Toàn màn hình"
                  >
                    {isFullscreen ? "🡼" : "⛶"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .playerWrap {
          margin-top: 22px;
        }

        .resumeText {
          margin-bottom: 12px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 0.95rem;
        }

        .playerShell {
          width: 100%;
          margin: 0 auto;
          border-radius: 26px;
          overflow: hidden;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)),
            #000;
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.42),
            0 0 0 1px rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .playerShell.isFullscreen {
          max-width: none !important;
          width: 100vw;
          height: 100vh;
          border-radius: 0;
        }

        .playerStage {
          position: relative;
          background: #000;
          overflow: hidden;
        }

        .playerOverlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            radial-gradient(
              circle at center,
              rgba(255, 255, 255, 0.08) 0%,
              rgba(255, 255, 255, 0.025) 18%,
              rgba(0, 0, 0, 0) 36%
            ),
            linear-gradient(
              to top,
              rgba(0, 0, 0, 0.52) 0%,
              rgba(0, 0, 0, 0.14) 30%,
              rgba(0, 0, 0, 0.08) 100%
            );
          transition: opacity 0.28s ease;
        }

        .playerOverlay.isHidden {
          opacity: 0;
        }

        .bigPlay {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 4;
          border: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #fff;
        }

        .bigPlay__circle {
          width: 96px;
          height: 96px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(12px);
          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          transition:
            transform 0.22s ease,
            background 0.22s ease;
        }

        .bigPlay:hover .bigPlay__circle {
          transform: scale(1.04);
          background: rgba(255, 255, 255, 0.18);
        }

        .bigPlay__triangle {
          font-size: 1.36rem;
          transform: translateX(3px);
        }

        .bigPlay__label {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.34);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(8px);
          font-weight: 700;
          font-size: 0.92rem;
        }

        .playerVideo {
          width: 100%;
          height: auto;
          max-height: 78vh;
          display: block;
          background: #000;
          object-fit: contain;
        }

        .playerShell.isFullscreen .playerVideo {
          width: 100%;
          height: 100vh;
          max-height: none;
          object-fit: contain;
        }

        .playerUi {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .playerUi.isVisible {
          opacity: 1;
        }

        .playerUi__top,
        .playerUi__bottom {
          pointer-events: auto;
        }

        .playerUi__top {
          padding: 18px 18px 0;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.5) 0%,
            rgba(0, 0, 0, 0.12) 65%,
            transparent 100%
          );
        }

        .playerUi__titleWrap {
          display: inline-flex;
          max-width: min(70%, 680px);
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(8, 10, 16, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
        }

        .playerUi__title {
          color: #fff;
          font-size: 0.98rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .playerUi__bottom {
          padding: 0 16px 16px;
          background: linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.74) 0%,
            rgba(0, 0, 0, 0.24) 58%,
            transparent 100%
          );
        }

        .playerUi__timelineWrap {
          position: relative;
          padding: 14px 0 10px;
        }

        .playerUi__tooltip {
          position: absolute;
          bottom: 100%;
          transform: translateX(-50%);
          margin-bottom: 10px;
          padding: 6px 10px;
          border-radius: 10px;
          background: rgba(13, 16, 24, 0.96);
          color: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.08);
          white-space: nowrap;
          pointer-events: none;
        }

        .playerUi__timelineBars {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 6px;
          transform: translateY(-50%);
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.16);
        }

        .playerUi__timelineBuffered,
        .playerUi__timelinePlayed {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          border-radius: 999px;
        }

        .playerUi__timelineBuffered {
          background: rgba(255, 255, 255, 0.26);
        }

        .playerUi__timelinePlayed {
          background: linear-gradient(90deg, #ff6b81 0%, #ffb36a 100%);
          z-index: 2;
        }

        .playerUi__range {
          position: relative;
          z-index: 3;
          width: 100%;
          margin: 0;
          appearance: none;
          -webkit-appearance: none;
          background: transparent;
          height: 24px;
          cursor: pointer;
        }

        .playerUi__range::-webkit-slider-runnable-track {
          height: 6px;
          background: transparent;
        }

        .playerUi__range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #111;
          margin-top: -5px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.24);
        }

        .playerUi__range::-moz-range-track {
          height: 6px;
          background: transparent;
        }

        .playerUi__range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border: 2px solid #111;
          border-radius: 50%;
          background: #fff;
        }

        .playerUi__controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .playerUi__left,
        .playerUi__right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .playerBtn {
          min-width: 42px;
          height: 42px;
          padding: 0 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
          font-weight: 800;
          backdrop-filter: blur(10px);
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .playerBtn:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .playerBtn--primary {
          min-width: 48px;
          background: #fff;
          color: #05070d;
        }

        .playerBtn--primary:hover {
          background: #fff;
        }

        .playerUi__time {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 42px;
          padding: 0 12px;
          border-radius: 14px;
          color: #fff;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 700;
          font-size: 0.92rem;
        }

        .playerUi__timeSep {
          opacity: 0.5;
        }

        .playerUi__volumeWrap {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px 0 0;
          min-height: 42px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .playerUi__volume {
          width: 92px;
          appearance: none;
          -webkit-appearance: none;
          background: transparent;
          cursor: pointer;
        }

        .playerUi__volume::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.2);
        }

        .playerUi__volume::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          margin-top: -4px;
        }

        .playerUi__volume::-moz-range-track {
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.2);
        }

        .playerUi__volume::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border: 0;
          border-radius: 50%;
          background: #fff;
        }

        @media (max-width: 768px) {
          .playerShell {
            max-width: 100% !important;
            border-radius: 18px;
          }

          .playerVideo {
            max-height: 72vh;
          }

          .bigPlay__circle {
            width: 76px;
            height: 76px;
          }

          .playerUi__top {
            padding: 12px 12px 0;
          }

          .playerUi__bottom {
            padding: 0 12px 12px;
          }

          .playerUi__titleWrap {
            max-width: 86%;
          }

          .playerUi__controls {
            gap: 10px;
          }

          .playerUi__left,
          .playerUi__right {
            flex-wrap: wrap;
          }

          .playerUi__volume {
            width: 72px;
          }

          .playerBtn,
          .playerBtn--primary {
            height: 40px;
            min-width: 40px;
          }

          .playerUi__time {
            font-size: 0.86rem;
          }
        }
      `}</style>
    </div>
  );
}

function formatTime(seconds) {
  const total = Math.floor(Number(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (!Number.isFinite(total) || total <= 0) {
    return "0:00";
  }

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}