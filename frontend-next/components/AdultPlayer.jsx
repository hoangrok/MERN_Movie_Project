"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { getContinue, saveContinue } from "@/lib/continue";
import { getSignedStreamUrl } from "@/lib/api";

export default function AdultPlayer({ movie }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const playerShellRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showCenterPlay, setShowCenterPlay] = useState(true);

  useEffect(() => {
    const continued = getContinue();
    const current = continued.find((item) => item._id === movie?._id);

    if (current?.currentTime && current.currentTime > 0) {
      setResumeTime(current.currentTime);
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
        setShowCenterPlay(true);

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

    const handleLoadedMetadata = () => {
      const vw = Number(video.videoWidth || 0);
      const vh = Number(video.videoHeight || 0);

      if (vw > 0 && vh > 0) {
        setIsPortrait(vh > vw);
      }

      setDuration(Number(video.duration || 0));
      setIsMuted(video.muted);

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

      if (!isSeeking) {
        setCurrentTime(video.currentTime || 0);
      }

      if (now - lastSaved < 5000) return;

      lastSaved = now;
      saveContinue(movie, video.currentTime || 0, video.duration || 0);
    };

    const handlePause = () => {
      setIsPlaying(false);
      setShowCenterPlay(true);
      saveContinue(movie, video.currentTime || 0, video.duration || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setShowCenterPlay(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setShowCenterPlay(true);
      saveContinue(movie, video.duration || 0, video.duration || 0);
    };

    const handleDurationChange = () => {
      setDuration(Number(video.duration || 0));
    };

    const handleVolumeChange = () => {
      setIsMuted(video.muted);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePause);
    video.addEventListener("play", handlePlay);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [isReady, movie, resumeTime, isSeeking]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (err) {
      console.error("togglePlay error:", err);
    }
  };

  const seekBy = (amount) => {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = Math.max(
      0,
      Math.min((video.duration || 0), (video.currentTime || 0) + amount)
    );

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleProgressChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = Number(e.target.value || 0);
    setCurrentTime(nextTime);
  };

  const handleSeekCommit = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = Number(e.target.value || 0);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    setIsSeeking(false);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = async () => {
    const el = playerShellRef.current;
    if (!el) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (err) {
      console.error("fullscreen error:", err);
    }
  };

  const playedPercent =
    duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

  return (
    <div className="playerWrap">
      {resumeTime > 0 ? (
        <div className="resumeText">Tiếp tục từ {formatTime(resumeTime)}</div>
      ) : null}

      <div
        ref={playerShellRef}
        className="playerShell"
        style={{
          maxWidth: isPortrait ? 560 : 980,
        }}
      >
        <div className="playerStage">
          <video
            ref={videoRef}
            playsInline
            poster={movie?.backdrop || movie?.poster || ""}
            className="playerVideo"
            onClick={togglePlay}
          />

          {showCenterPlay ? (
            <button
              type="button"
              className="centerPlay"
              onClick={togglePlay}
              aria-label={isPlaying ? "Tạm dừng" : "Phát video"}
            >
              <span className="centerPlay__icon">
                {isPlaying ? "❚❚" : "▶"}
              </span>
            </button>
          ) : null}

          <div className="playerGradient" />

          <div className="controls">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleProgressChange}
              onMouseDown={() => setIsSeeking(true)}
              onMouseUp={handleSeekCommit}
              onTouchStart={() => setIsSeeking(true)}
              onTouchEnd={handleSeekCommit}
              className="progress"
              style={{
                "--played": `${playedPercent}%`,
              }}
            />

            <div className="controlsRow">
              <div className="controlsLeft">
                <button
                  type="button"
                  className="controlBtn controlBtn--primary"
                  onClick={togglePlay}
                >
                  {isPlaying ? "❚❚" : "▶"}
                </button>

                <button
                  type="button"
                  className="controlBtn"
                  onClick={() => seekBy(-5)}
                >
                  -5s
                </button>

                <button
                  type="button"
                  className="controlBtn"
                  onClick={() => seekBy(5)}
                >
                  +5s
                </button>

                <button
                  type="button"
                  className="controlBtn"
                  onClick={toggleMute}
                >
                  {isMuted ? "🔇" : "🔊"}
                </button>

                <div className="timeText">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="controlsRight">
                <button
                  type="button"
                  className="controlBtn"
                  onClick={toggleFullscreen}
                >
                  ⛶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .playerWrap {
          margin-top: 20px;
        }

        .resumeText {
          margin-bottom: 12px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 0.95rem;
        }

        .playerShell {
          width: 100%;
          margin: 0 auto;
          border-radius: 22px;
          overflow: hidden;
          background: #000;
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.36),
            0 0 0 1px rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .playerStage {
          position: relative;
          background: #000;
        }

        .playerVideo {
          width: 100%;
          height: auto;
          max-height: 78vh;
          display: block;
          background: #000;
          object-fit: contain;
          cursor: pointer;
        }

        .playerGradient {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 180px;
          pointer-events: none;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.9) 0%,
            rgba(0, 0, 0, 0.48) 40%,
            rgba(0, 0, 0, 0) 100%
          );
        }

        .centerPlay {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 88px;
          height: 88px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
          backdrop-filter: blur(12px);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          z-index: 4;
          box-shadow:
            0 18px 44px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .centerPlay__icon {
          font-size: 1.5rem;
          transform: translateX(2px);
        }

        .controls {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 5;
          padding: 0 16px 16px;
        }

        .progress {
          width: 100%;
          margin: 0 0 14px;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          outline: none;
          background: linear-gradient(
            to right,
            #ffffff 0%,
            #ffffff var(--played),
            rgba(255, 255, 255, 0.18) var(--played),
            rgba(255, 255, 255, 0.18) 100%
          );
          cursor: pointer;
        }

        .progress::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #fff;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
        }

        .progress::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #fff;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
        }

        .controlsRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .controlsLeft,
        .controlsRight {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .controlBtn {
          min-width: 46px;
          height: 42px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-weight: 800;
          font-size: 0.95rem;
          backdrop-filter: blur(10px);
        }

        .controlBtn--primary {
          background: #fff;
          color: #05070d;
        }

        .timeText {
          color: rgba(255, 255, 255, 0.84);
          font-size: 0.93rem;
          font-weight: 700;
          padding-left: 4px;
        }

        @media (max-width: 768px) {
          .playerShell {
            max-width: 100% !important;
            border-radius: 16px;
          }

          .playerVideo {
            max-height: 72vh;
          }

          .centerPlay {
            width: 72px;
            height: 72px;
          }

          .controls {
            padding: 0 12px 12px;
          }

          .controlBtn {
            min-width: 42px;
            height: 38px;
            padding: 0 12px;
            border-radius: 12px;
            font-size: 0.9rem;
          }

          .timeText {
            font-size: 0.86rem;
          }
        }
      `}</style>
    </div>
  );
}

function formatTime(seconds) {
  const total = Math.floor(Number(seconds || 0));
  if (!Number.isFinite(total) || total < 0) return "0:00";

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}