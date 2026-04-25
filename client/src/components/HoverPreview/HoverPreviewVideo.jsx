import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { API_URL } from "../../utils/api";

const signedUrlCache = new Map();

function getStoredToken() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.token || user?.accessToken || "";
  } catch {
    return "";
  }
}

function isHlsUrl(url = "") {
  return /\.m3u8(\?|#|$)/i.test(url);
}

async function getSignedStreamUrl(movieId, signal) {
  if (!movieId) return "";

  const cached = signedUrlCache.get(movieId);
  if (cached?.url && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const token = getStoredToken();
  const res = await fetch(`${API_URL}/movies/${movieId}/stream`, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();

  if (!res.ok || !data.success || !data.signedUrl) {
    throw new Error(data.message || "Cannot load preview stream");
  }

  signedUrlCache.set(movieId, {
    url: data.signedUrl,
    expiresAt: Date.now() + 1000 * 60 * 60 * 10,
  });

  return data.signedUrl;
}

export default function HoverPreviewVideo({
  active,
  movieId,
  directUrl = "",
  poster = "",
  frames = [],
  className = "",
  startAt = 18,
  delay = 520,
  onVisibleChange,
  onError,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [frameVisible, setFrameVisible] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    let disposed = false;
    let timer = null;
    let frameTimer = null;
    let frameInterval = null;
    let videoPreviewVisible = false;
    let playStarted = false;
    const controller = new AbortController();

    const notifyVisible = (next) => {
      if (disposed) return;
      onVisibleChange?.(next);
    };

    const stopFrameLoop = () => {
      if (frameInterval) {
        clearInterval(frameInterval);
        frameInterval = null;
      }
    };

    const showFallback = () => {
      if (disposed || videoPreviewVisible || frames.length === 0) return;

      setFrameVisible(true);
      notifyVisible(true);

      if (!frameInterval) {
        frameInterval = setInterval(() => {
          setFrameIndex((index) => (index + 1) % frames.length);
        }, 700);
      }
    };

    const stopVideoOnly = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const video = videoRef.current;
      if (video) {
        try {
          video.onerror = null;
          video.onloadedmetadata = null;
          video.oncanplay = null;
          video.pause();
          video.removeAttribute("src");
          video.load();
        } catch {}
      }
    };

    const cleanup = (updateState = true) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      if (frameTimer) {
        clearTimeout(frameTimer);
        frameTimer = null;
      }

      stopFrameLoop();
      controller.abort();
      stopVideoOnly();

      videoPreviewVisible = false;
      playStarted = false;
      if (updateState) {
        setVisible(false);
        setFrameVisible(false);
        setFrameIndex(0);
        notifyVisible(false);
      }
    };

    const failVideoPreview = (err) => {
      if (disposed) return;

      stopVideoOnly();
      videoPreviewVisible = false;
      playStarted = false;
      setVisible(false);

      if (frames.length > 0) {
        showFallback();
      } else {
        setFrameVisible(false);
        notifyVisible(false);
      }

      onError?.(err);
    };

    const playVideo = async () => {
      const video = videoRef.current;
      if (!video || disposed || playStarted) return;

      playStarted = true;

      try {
        if (
          Number.isFinite(video.duration) &&
          video.duration > startAt + 12 &&
          video.currentTime < 1
        ) {
          video.currentTime = startAt;
        }
      } catch {}

      try {
        const promise = video.play();
        if (promise && typeof promise.then === "function") {
          await promise;
        }

        if (disposed) return;
        videoPreviewVisible = true;
        setVisible(true);
        setFrameVisible(false);
        notifyVisible(true);
      } catch (err) {
        failVideoPreview(err);
      }
    };

    const startPreview = async () => {
      try {
        let src = "";

        if (movieId) {
          try {
            src = await getSignedStreamUrl(movieId, controller.signal);
          } catch (err) {
            if (!directUrl) throw err;
            src = directUrl;
          }
        } else {
          src = directUrl;
        }

        const video = videoRef.current;

        if (!src || !video || disposed) return;

        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "auto";
        video.poster = poster || "";

        video.onerror = () => {
          failVideoPreview(new Error("Preview video failed"));
        };

        if (isHlsUrl(src) && Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 18,
            maxMaxBufferLength: 24,
            fragLoadingMaxRetry: 1,
            manifestLoadingMaxRetry: 1,
          });

          hlsRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, playVideo);
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data?.fatal) {
              failVideoPreview(new Error(data?.details || "HLS preview failed"));
            }
          });
          return;
        }

        video.src = src;
        video.onloadedmetadata = playVideo;
        video.oncanplay = playVideo;
        video.load();
      } catch (err) {
        if (err?.name === "AbortError") return;
        failVideoPreview(err);
      }
    };

    if (active && (movieId || directUrl || frames.length > 0)) {
      if (frames.length > 0) {
        setFrameIndex(0);
        frameTimer = setTimeout(() => {
          showFallback();
        }, Math.min(delay, 260));
      }

      if (movieId || directUrl) {
        timer = setTimeout(startPreview, delay);
      }
    } else {
      cleanup();
    }

    return () => {
      disposed = true;
      cleanup(false);
    };
  }, [
    active,
    movieId,
    directUrl,
    frames,
    poster,
    startAt,
    delay,
    onVisibleChange,
    onError,
  ]);

  const frameSrc = frames[frameIndex] || "";

  return (
    <>
      {frameSrc ? (
        <img
          className={`${className} ${
            frameVisible && !visible ? "is-visible" : ""
          }`.trim()}
          src={frameSrc}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      ) : null}

      <video
        ref={videoRef}
        className={`${className} ${visible ? "is-visible" : ""}`.trim()}
        muted
        playsInline
        loop
        preload="none"
        poster={poster}
        aria-hidden="true"
      />
    </>
  );
}
