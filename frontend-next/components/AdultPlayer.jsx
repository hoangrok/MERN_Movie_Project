"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { getContinue, saveContinue } from "@/lib/continue";

export default function AdultPlayer({ movie }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [isReady, setIsReady] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);

  useEffect(() => {
    const continued = getContinue();
    const current = continued.find((item) => item._id === movie?._id);

    if (current?.currentTime && current.currentTime > 0) {
      setResumeTime(current.currentTime);
    }
  }, [movie?._id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movie?.hlsUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = movie.hlsUrl;
      setIsReady(true);
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(movie.hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
      });

      hlsRef.current = hls;
    } else {
      video.src = movie.hlsUrl;
      setIsReady(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [movie?.hlsUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    const handleLoadedMetadata = () => {
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

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [isReady, movie, resumeTime]);

  return (
    <div style={{ marginTop: 20 }}>
      {resumeTime > 0 ? (
        <div
          style={{
            marginBottom: 12,
            color: "rgba(255,255,255,0.72)",
            fontSize: "0.95rem",
          }}
        >
          Tiếp tục từ {formatTime(resumeTime)}
        </div>
      ) : null}

      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        poster={movie?.backdrop || movie?.poster || ""}
        style={{
          width: "100%",
          borderRadius: 14,
          background: "#000",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      />
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