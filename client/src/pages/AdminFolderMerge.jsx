import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import { API_URL } from "../utils/api";
import { useSelector } from "react-redux";
import "./AdminFolderMerge.scss";

const POLL_INTERVAL = 4000;

const VIDEO_EXTS = new Set([".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".ts", ".m4v", ".wmv"]);

const isVideo = (name = "") => VIDEO_EXTS.has(name.slice(name.lastIndexOf(".")).toLowerCase());

const fmtSize = (b) => {
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${(b / 1e3).toFixed(0)} KB`;
};

const fmtDuration = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

const STATUS_STEPS = ["queued", "processing", "ready"];
const STATUS_LABEL = { queued: "Đang chờ", processing: "Đang mã hoá", ready: "Hoàn tất", failed: "Lỗi" };

export default function AdminFolderMerge() {
  const { user } = useSelector((s) => s.auth);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const [files, setFiles] = useState([]); // {file, id}
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [isDraggingDrop, setIsDraggingDrop] = useState(false);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [genre, setGenre] = useState("");
  const [contentArea, setContentArea] = useState("default");
  const [sortBy, setSortBy] = useState("name");

  const [uploadProgress, setUploadProgress] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | uploading | polling | done | error
  const [statusMovie, setStatusMovie] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [movieId, setMovieId] = useState(null);
  const pollRef = useRef(null);

  /* ── File handling ── */
  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter((f) => isVideo(f.name));
    if (!valid.length) return;
    setFiles((prev) => {
      const existingNames = new Set(prev.map((e) => e.file.name));
      const next = valid.filter((f) => !existingNames.has(f.name)).map((f) => ({ file: f, id: `${f.name}-${f.size}` }));
      const merged = [...prev, ...next];
      if (sortBy === "name") merged.sort((a, b) => a.file.name.localeCompare(b.file.name));
      return merged;
    });
  };

  const removeFile = (id) => setFiles((prev) => prev.filter((e) => e.id !== id));

  /* ── Drag-to-reorder ── */
  const onDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e, id) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) return;
    setFiles((prev) => {
      const from = prev.findIndex((x) => x.id === draggingId);
      const to = prev.findIndex((x) => x.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDraggingId(null);
    setDragOverId(null);
  };
  const onDragEnd = () => { setDraggingId(null); setDragOverId(null); };

  /* ── Drop zone ── */
  const onDropZone = (e) => {
    e.preventDefault();
    setIsDraggingDrop(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  /* ── Status poll ── */
  const startPoll = (mid) => {
    setPhase("polling");
    const tick = async () => {
      try {
        const r = await fetch(`${API_URL}/upload/status/${mid}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await r.json();
        if (data.success) {
          setStatusMovie(data.movie);
          if (data.movie.status === "ready" || data.movie.status === "failed") {
            setPhase(data.movie.status === "ready" ? "done" : "error");
            if (data.movie.status === "failed") setErrorMsg(data.movie.processingError || "Xử lý thất bại");
            clearInterval(pollRef.current);
          }
        }
      } catch (_) { /* ignore */ }
    };
    tick();
    pollRef.current = setInterval(tick, POLL_INTERVAL);
  };

  /* ── Submit ── */
  const handleSubmit = () => {
    if (!files.length) return;
    if (!title.trim()) { setErrorMsg("Nhập tên video trước"); return; }
    setErrorMsg("");
    setPhase("uploading");
    setUploadProgress(0);

    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("year", year);
    fd.append("genre", genre);
    fd.append("contentArea", contentArea);
    fd.append("sortBy", "manual");
    fd.append("order", JSON.stringify(files.map((e) => e.file.name)));
    for (const { file } of files) fd.append("videos", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/upload/folder-merge`);
    xhr.setRequestHeader("Authorization", `Bearer ${user.token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success) {
          setMovieId(data.movieId);
          startPoll(data.movieId);
        } else {
          setPhase("error");
          setErrorMsg(data.message || "Upload thất bại");
        }
      } catch {
        setPhase("error");
        setErrorMsg("Lỗi kết nối server");
      }
    };
    xhr.onerror = () => { setPhase("error"); setErrorMsg("Lỗi mạng"); };
    xhr.send(fd);
  };

  const reset = () => {
    clearInterval(pollRef.current);
    setFiles([]);
    setPhase("idle");
    setUploadProgress(0);
    setStatusMovie(null);
    setErrorMsg("");
    setMovieId(null);
    setTitle("");
  };

  const totalSize = files.reduce((s, e) => s + e.file.size, 0);
  const isWorking = phase === "uploading" || phase === "polling";

  return (
    <div className="fmerge-page">
      <Navbar />
      <div className="fmerge-shell">
        <div className="fmerge-header">
          <h1>Ghép folder video</h1>
          <p>Chọn nhiều video → tự động ghép thành 1 tập dài → mã hoá HLS</p>
        </div>

        {phase === "idle" || phase === "uploading" ? (
          <>
            {/* Drop zone */}
            <div
              ref={dropRef}
              className={`fmerge-dropzone ${isDraggingDrop ? "active" : ""} ${files.length ? "has-files" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingDrop(true); }}
              onDragLeave={() => setIsDraggingDrop(false)}
              onDrop={onDropZone}
              onClick={() => !files.length && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,.mkv,.ts,.flv"
                style={{ display: "none" }}
                onChange={(e) => addFiles(e.target.files)}
              />
              {files.length === 0 ? (
                <div className="fmerge-dropzone__empty">
                  <div className="fmerge-dropzone__icon">📁</div>
                  <p>Kéo thả folder hoặc chọn file video</p>
                  <span>mp4 · mkv · avi · mov · webm · ts · flv</span>
                  <button type="button" className="fmerge-btn fmerge-btn--ghost" onClick={() => fileInputRef.current?.click()}>
                    Chọn video
                  </button>
                </div>
              ) : (
                <div className="fmerge-dropzone__overlay">
                  <span>+ Thả file vào để thêm</span>
                </div>
              )}
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="fmerge-filelist">
                <div className="fmerge-filelist__head">
                  <span>{files.length} video · {fmtSize(totalSize)}</span>
                  <button type="button" className="fmerge-btn fmerge-btn--ghost fmerge-btn--sm" onClick={() => fileInputRef.current?.click()}>
                    + Thêm
                  </button>
                </div>
                <div className="fmerge-filelist__body">
                  {files.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`fmerge-file ${draggingId === entry.id ? "dragging" : ""} ${dragOverId === entry.id ? "drag-over" : ""}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, entry.id)}
                      onDragOver={(e) => onDragOver(e, entry.id)}
                      onDrop={(e) => onDrop(e, entry.id)}
                      onDragEnd={onDragEnd}
                    >
                      <span className="fmerge-file__num">{idx + 1}</span>
                      <span className="fmerge-file__drag">⠿</span>
                      <span className="fmerge-file__name">{entry.file.name}</span>
                      <span className="fmerge-file__size">{fmtSize(entry.file.size)}</span>
                      <button
                        type="button"
                        className="fmerge-file__remove"
                        onClick={() => removeFile(entry.id)}
                        disabled={isWorking}
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Config */}
            {files.length > 0 && (
              <div className="fmerge-config">
                <div className="fmerge-config__row">
                  <label>Tên video *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tên cho video sau khi ghép..."
                    disabled={isWorking}
                  />
                </div>
                <div className="fmerge-config__row fmerge-config__row--3">
                  <div>
                    <label>Năm</label>
                    <input type="number" value={year} onChange={(e) => setYear(e.target.value)} min="2000" max="2030" disabled={isWorking} />
                  </div>
                  <div>
                    <label>Thể loại</label>
                    <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Action, Romance..." disabled={isWorking} />
                  </div>
                  <div>
                    <label>Khu vực</label>
                    <select value={contentArea} onChange={(e) => setContentArea(e.target.value)} disabled={isWorking}>
                      <option value="default">Mặc định</option>
                      <option value="world">Thế giới</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Upload progress */}
            {phase === "uploading" && (
              <div className="fmerge-progress">
                <div className="fmerge-progress__label">
                  <span>Đang upload... {uploadProgress}%</span>
                  <span>{fmtSize((uploadProgress / 100) * totalSize)} / {fmtSize(totalSize)}</span>
                </div>
                <div className="fmerge-progress__bar">
                  <div className="fmerge-progress__fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {errorMsg && <div className="fmerge-error">{errorMsg}</div>}

            {files.length > 0 && (
              <button
                type="button"
                className="fmerge-btn fmerge-btn--primary fmerge-btn--large"
                onClick={handleSubmit}
                disabled={isWorking}
              >
                {isWorking ? "Đang xử lý..." : `🚀 Ghép & Upload ${files.length} video`}
              </button>
            )}
          </>
        ) : null}

        {/* Status panel */}
        {(phase === "polling" || phase === "done" || phase === "error") && (
          <div className="fmerge-status">
            <div className="fmerge-status__steps">
              {STATUS_STEPS.map((s, i) => {
                const current = statusMovie?.status || "queued";
                const currentIdx = STATUS_STEPS.indexOf(current);
                const done = i < currentIdx || current === "ready";
                const active = s === current;
                return (
                  <div key={s} className={`fmerge-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
                    <div className="fmerge-step__dot">{done ? "✓" : i + 1}</div>
                    <span>{STATUS_LABEL[s]}</span>
                  </div>
                );
              })}
            </div>

            {statusMovie?.status === "ready" && (
              <div className="fmerge-status__done">
                <div className="fmerge-status__thumb">
                  {statusMovie.backdrop || statusMovie.poster ? (
                    <img src={statusMovie.backdrop || statusMovie.poster} alt={statusMovie.title} />
                  ) : <div className="fmerge-status__thumb-empty">🎬</div>}
                </div>
                <div className="fmerge-status__info">
                  <h3>{statusMovie.title}</h3>
                  {statusMovie.previewTimeline?.duration > 0 && (
                    <p>Thời lượng: {fmtDuration(statusMovie.previewTimeline.duration)}</p>
                  )}
                  <div className="fmerge-status__actions">
                    <Link to={`/movie/${statusMovie.slug || movieId}`} className="fmerge-btn fmerge-btn--primary">
                      Xem ngay
                    </Link>
                    <Link to={`/admin/new-movie?edit=${movieId}`} className="fmerge-btn fmerge-btn--ghost">
                      Chỉnh sửa
                    </Link>
                    <button type="button" className="fmerge-btn fmerge-btn--ghost" onClick={reset}>
                      Upload tiếp
                    </button>
                  </div>
                </div>
              </div>
            )}

            {statusMovie?.status === "failed" && (
              <div className="fmerge-error">
                <strong>Lỗi:</strong> {statusMovie.processingError || "Xử lý thất bại"}
                <button type="button" className="fmerge-btn fmerge-btn--ghost fmerge-btn--sm" onClick={reset} style={{ marginLeft: 12 }}>
                  Thử lại
                </button>
              </div>
            )}

            {(statusMovie?.status === "queued" || statusMovie?.status === "processing") && (
              <div className="fmerge-status__waiting">
                <div className="fmerge-spinner" />
                <span>
                  {statusMovie?.status === "queued" ? "Đang xếp hàng chờ ghép..." : "Đang mã hoá HLS..."}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
