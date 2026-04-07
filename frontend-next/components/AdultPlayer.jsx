"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { getContinue, saveContinue } from "@/lib/continue";
import { getSignedStreamUrl } from "@/lib/api";

export default function AdultPlayer({ movie }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

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

      if (
        resumeTime > 0 &&
        Number.isFinite(video.duration) &&
        resumeTime < video.duration - 3
      ) {
        video.currentTime = resumeTime;
      }
    };

    let lastSaved = 0;

    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastSaved < 5000) return;

      lastSaved = now;
      saveContinue(movie, video.currentTime || 0, video.duration || 0);
    };

    const handlePause = () => {
      saveContinue(movie, video.currentTime || 0, video.duration || 0);
    };

    const handleEnded = () => {
      saveContinue(movie, video.duration || 0, video.duration || 0);
    };

    const handlePlay = () => {
      setHasStarted(true);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
    };
  }, [isReady, movie, resumeTime]);

  const handleBigPlay = async () => {
    try {
      const video = videoRef.current;
      if (!video) return;
      await video.play();
      setHasStarted(true);
    } catch (err) {
      console.error("play error:", err);
    }
  };

  return (
    <div className="playerWrap">
      {resumeTime > 0 ? (
        <div className="resumeText">Tiếp tục từ {formatTime(resumeTime)}</div>
      ) : null}

      <div
        className="playerShell"
        style={{
          maxWidth: isPortrait ? 520 : 980,
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
            controls
            autoPlay
            playsInline
            poster={movie?.backdrop || movie?.poster || ""}
            className="playerVideo"
          />
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
            0 24px 70px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .playerStage {
          position: relative;
          background: #000;
        }

        .playerOverlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            radial-gradient(
              circle at center,
              rgba(255, 255, 255, 0.06) 0%,
              rgba(255, 255, 255, 0.02) 20%,
              rgba(0, 0, 0, 0) 36%
            ),
            linear-gradient(
              to top,
              rgba(0, 0, 0, 0.48) 0%,
              rgba(0, 0, 0, 0.1) 28%,
              rgba(0, 0, 0, 0.06) 100%
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
          z-index: 3;
          border: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #fff;
        }

        .bigPlay__circle {
          width: 92px;
          height: 92px;
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
          font-size: 1.32rem;
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

        @media (max-width: 768px) {
          .playerShell {
            max-width: 100% !important;
            border-radius: 16px;
          }

          .playerVideo {
            max-height: 72vh;
          }

          .bigPlay__circle {
            width: 74px;
            height: 74px;
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

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}