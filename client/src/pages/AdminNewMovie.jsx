import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { API_URL } from "../utils/api";

export default function AdminNewMovie({ forcedContentArea = "" }) {
  const navigate = useNavigate();
  const authState = useSelector((state) => state.auth);
  const isWorldAdmin = forcedContentArea === "world";

  const authToken =
    authState?.token ||
    authState?.user?.token ||
    authState?.user?.accessToken ||
    "";

  const [form, setForm] = useState({
    title: "",
    description: "",
    poster: "",
    backdrop: "",
    genre: "",
    country: "",
    year: "",
    rating: "",
    duration: "",
    contentArea: forcedContentArea === "world" ? "world" : "default",
    isPublished: true,
    seriesId: "",
    seriesTitle: "",
    season: "",
    episode: "",
    episodeLabel: "",
    episodeTitle: "",
  });

  const [posterFile, setPosterFile] = useState(null);
  const [backdropFile, setBackdropFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryMessage, setGalleryMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [movieId, setMovieId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [queueSnapshot, setQueueSnapshot] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [manualReprocessId, setManualReprocessId] = useState("");
  const [reprocessState, setReprocessState] = useState({
    loading: false,
    message: "",
  });

  // TMDB auto-fill
  const [tmdbQuery, setTmdbQuery]     = useState("");
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbOpen, setTmdbOpen]       = useState(false);
  const tmdbDebounce                  = useRef(null);

  const handleTmdbInput = (e) => {
    const q = e.target.value;
    setTmdbQuery(q);
    setTmdbOpen(!!q.trim());
    if (tmdbDebounce.current) clearTimeout(tmdbDebounce.current);
    if (!q.trim()) { setTmdbResults([]); return; }
    tmdbDebounce.current = setTimeout(async () => {
      setTmdbLoading(true);
      try {
        const res = await fetch(`${API_URL}/movies/tmdb-search?q=${encodeURIComponent(q)}`, {
          headers: { ...getAuthHeaders() },
        });
        const data = await res.json();
        setTmdbResults(data.results || []);
      } catch { setTmdbResults([]); }
      finally { setTmdbLoading(false); }
    }, 420);
  };

  const applyTmdb = async (result) => {
    setTmdbOpen(false);
    setTmdbQuery(result.title);
    // Fill immediately with search data
    setForm((prev) => ({
      ...prev,
      title: result.title || prev.title,
      description: result.overview || prev.description,
      poster: result.poster || prev.poster,
      backdrop: result.backdrop || prev.backdrop,
      year: result.year || prev.year,
      rating: result.rating ? String(result.rating) : prev.rating,
      genre: result.genres?.join(", ") || prev.genre,
    }));
    // Then fetch full details for runtime
    try {
      const res = await fetch(`${API_URL}/movies/tmdb-details/${result.tmdbId}`, {
        headers: { ...getAuthHeaders() },
      });
      const d = await res.json();
      if (d.success && d.duration) {
        setForm((prev) => ({ ...prev, duration: String(d.duration) }));
      }
    } catch {}
  };
  const pollRef = useRef(null);
  const batchPollRef = useRef(null);
  const batchFilesRef = useRef([]);
  const batchFileInputRef = useRef(null);
  const batchFolderInputRef = useRef(null);
  const batchImageInputRef = useRef(null);

  // -- Batch / Series mode --
  const [mode, setMode] = useState("single");
  const [batchSeries, setBatchSeries] = useState({
    seriesId: "", seriesTitle: "", season: "1",
    genre: "", year: "", rating: "", isPublished: true,
    country: "",
    contentArea: forcedContentArea === "world" ? "world" : "default",
  });
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchImageFiles, setBatchImageFiles] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchStatusMessage, setBatchStatusMessage] = useState("");
  const [batchMergeOptions, setBatchMergeOptions] = useState({
    enabled: false,
    targetDuration: 900,
    sortBy: "name",
  });

  const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".webm", ".mov", ".m4v"];
  const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

  const posterPreviewSrc = useMemo(() => {
    if (posterFile) return URL.createObjectURL(posterFile);
    return form.poster.trim();
  }, [form.poster, posterFile]);

  const backdropPreviewSrc = useMemo(() => {
    if (backdropFile) return URL.createObjectURL(backdropFile);
    return form.backdrop.trim();
  }, [backdropFile, form.backdrop]);

  const handleGalleryFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setGalleryFiles(files);
    setGalleryPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const uploadGalleryImages = async () => {
    if (!galleryFiles.length || !movieId) return;
    setGalleryUploading(true);
    setGalleryMessage("Đang upload ảnh...");

    try {
      const fd = new FormData();
      galleryFiles.forEach((f) => fd.append("images", f));

      const res = await fetch(`${API_URL}/upload/movie-images/${movieId}`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
        body: fd,
      });

      const data = await parseJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.message || "Upload ảnh thất bại");

      setUploadedImages(data.images || []);
      setGalleryFiles([]);
      setGalleryPreviews([]);
      setGalleryMessage(`Đã upload ${data.added} ảnh thành công`);
    } catch (err) {
      setGalleryMessage(err.message);
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const parseJsonSafe = async (res) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(text || "Response không phải JSON hợp lệ");
    }
  };

  const getBatchEntryPath = (file, fallbackPath = "") =>
    file?.webkitRelativePath || fallbackPath || file?.name || "";

  const getBatchEntryKey = (file, fallbackPath = "") =>
    `${getBatchEntryPath(file, fallbackPath)}__${file?.size || 0}`;

  const isVideoFile = (file) => {
    const lowerName = String(file?.name || "").toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  };

  const isImageFile = (file) => {
    const lowerName = String(file?.name || "").toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  };

  const createBatchVideoItem = (file, fallbackPath = "") => ({
    file,
    sourcePath: getBatchEntryPath(file, fallbackPath),
    sourceKey: getBatchEntryKey(file, fallbackPath),
    episodeLabel: "",
    episodeTitle: "",
    status: "pending",
    percent: 0,
    movieId: "",
    error: "",
  });

  const addBatchAssets = (entries = []) => {
    const normalized = entries
      .map((entry) =>
        entry?.file
          ? entry
          : { file: entry, relativePath: getBatchEntryPath(entry) }
      )
      .filter((entry) => entry?.file);

    const videoEntries = normalized.filter(({ file }) => isVideoFile(file));
    const imageEntries = normalized.filter(({ file }) => isImageFile(file));

    if (videoEntries.length > 0) {
      setBatchFiles((prev) => {
        const seen = new Set(prev.map((item) => item.sourceKey));
        const additions = videoEntries
          .map(({ file, relativePath }) => createBatchVideoItem(file, relativePath))
          .filter((item) => {
            if (seen.has(item.sourceKey)) return false;
            seen.add(item.sourceKey);
            return true;
          });
        return reindexBatchFiles([...prev, ...additions]);
      });
    }

    if (imageEntries.length > 0) {
      setBatchImageFiles((prev) => {
        const seen = new Set(prev.map((item) => item.sourceKey));
        const additions = imageEntries
          .map(({ file, relativePath }) => ({
            file,
            sourcePath: getBatchEntryPath(file, relativePath),
            sourceKey: getBatchEntryKey(file, relativePath),
          }))
          .filter((item) => {
            if (seen.has(item.sourceKey)) return false;
            seen.add(item.sourceKey);
            return true;
          });
        return [...prev, ...additions];
      });
    }

    if (normalized.length > 0 && !batchLoading) {
      const ignoredCount = normalized.length - videoEntries.length - imageEntries.length;
      const parts = [];
      if (videoEntries.length > 0) parts.push(`${videoEntries.length} video`);
      if (imageEntries.length > 0) parts.push(`${imageEntries.length} ảnh`);
      if (ignoredCount > 0) parts.push(`bỏ qua ${ignoredCount} file khác`);
      setBatchStatusMessage(`Đã nhận ${parts.join(" + ")} từ folder/file.`);
    }
  };

  const getAuthHeaders = () => {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  };

  const getBaseOrigin = () => {
    return API_URL.replace(/\/api$/, "");
  };

  const uploadMovieImages = async (targetMovieId, imageItems = []) => {
    if (!targetMovieId || imageItems.length === 0) return null;

    const fd = new FormData();
    imageItems.forEach((item) => fd.append("images", item.file || item));

    const res = await fetch(`${API_URL}/upload/movie-images/${targetMovieId}`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
      body: fd,
    });

    const data = await parseJsonSafe(res);
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Upload ảnh cho seri thất bại");
    }
    return data;
  };

  const readDroppedEntry = async (entry) => {
    if (!entry) return [];

    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file) => {
          resolve([
            {
              file,
              relativePath: String(entry.fullPath || "").replace(/^\/+/, "") || file.name,
            },
          ]);
        });
      });
    }

    if (entry.isDirectory) {
      const reader = entry.createReader();
      const children = [];

      const readAll = () =>
        new Promise((resolve, reject) => {
          reader.readEntries((entries) => {
            if (!entries.length) { resolve(children); return; }
            children.push(...entries);
            resolve(readAll());
          }, reject);
        });

      const nestedEntries = await readAll();
      const nestedFiles = await Promise.all(
        nestedEntries.map((child) => readDroppedEntry(child))
      );
      return nestedFiles.flat();
    }

    return [];
  };

  const handleBatchDrop = async (e) => {
    e.preventDefault();

    const itemList = Array.from(e.dataTransfer?.items || []);
    const entryReaders = itemList
      .map((item) => item.webkitGetAsEntry?.())
      .filter(Boolean);

    if (entryReaders.length > 0) {
      const droppedFiles = await Promise.all(
        entryReaders.map((entry) => readDroppedEntry(entry))
      );
      addBatchAssets(droppedFiles.flat());
      return;
    }

    addBatchAssets(Array.from(e.dataTransfer?.files || []));
  };

  const wakeServer = async () => {
    const healthUrl = `${getBaseOrigin()}/health`;
    try {
      const res = await fetch(healthUrl, { method: "GET" });
      await res.text();
      console.log("Wake server OK:", healthUrl);
    } catch (err) {
      console.warn("Wake server failed:", err);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return "";

    const fd = new FormData();
    fd.append("image", file);

    const res = await fetch(`${API_URL}/upload/image`, {
      method: "POST",
      headers: { ...getAuthHeaders() },
      body: fd,
    });

    const data = await parseJsonSafe(res);

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Upload ảnh thất bại");
    }

    return data.url;
  };

  const uploadMultipleVideosWithProgress = (targetMovieId, files, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!files || files.length === 0) return resolve(null);

      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      files.forEach((file) => fd.append("videos", file));

      const params = new URLSearchParams();
      if (options.targetDuration) params.append("targetDuration", options.targetDuration);
      if (options.sortBy) params.append("sortBy", options.sortBy);

      const url = `${API_URL}/upload/videos/${targetMovieId}?${params.toString()}`;
      xhr.open("POST", url, true);

      if (authToken) {
        xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadPercent(percent);
        setMessage(`Đang upload ${files.length} videos... ${percent}%`);
      };

      xhr.onload = () => {
        try {
          const text = xhr.responseText || "";
          const data = text ? JSON.parse(text) : {};
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            resolve(data);
          } else {
            reject(new Error(data.message || `Upload videos thất bại (${xhr.status})`));
          }
        } catch (err) {
          reject(new Error("Response upload videos không hợp lệ"));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Không thể kết nối API upload videos. Kiểm tra domain / backend / CORS."));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload videos bị timeout"));
      };

      xhr.timeout = 1000 * 60 * 60;
      xhr.send(fd);
    });
  };

  const uploadVideoViaPresign = async (targetMovieId, file, { onProgress, isBatch = false } = {}) => {
    if (!file) return null;

    // 1. Get presigned PUT URL from backend
    const presignRes = await fetch(`${API_URL}/upload/presign-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        movieId: targetMovieId,
        filename: file.name,
        contentType: file.type || "video/mp4",
      }),
    });
    const presignData = await parseJsonSafe(presignRes);
    if (!presignRes.ok || !presignData.success) {
      throw new Error(presignData.message || "Không lấy được presign URL");
    }
    const { presignedUrl, r2Key, publicUrl } = presignData;

    // 2. Upload file directly to R2 (bypasses Render — no 90s timeout)
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable || !onProgress) return;
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload R2 thất bại (${xhr.status}). Kiểm tra CORS bucket R2.`));
      };
      xhr.onerror = () => reject(new Error("Không kết nối được R2. Kiểm tra CORS bucket."));
      xhr.ontimeout = () => reject(new Error("Upload R2 timeout"));
      xhr.timeout = 1000 * 60 * 120;
      xhr.send(file);
    });

    // 3. Tell backend to queue processing from the R2 public URL
    const processRes = await fetch(`${API_URL}/upload/process-from-url/${targetMovieId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ videoUrl: publicUrl, r2Key, isBatchUpload: isBatch }),
    });
    const processData = await parseJsonSafe(processRes);
    if (!processRes.ok || !processData.success) {
      throw new Error(processData.message || "Không đưa được vào queue xử lý");
    }
    return processData;
  };

  const uploadVideoWithProgress = (targetMovieId, file) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);

      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("video", file);

      xhr.open("POST", `${API_URL}/upload/video/${targetMovieId}`, true);

      if (authToken) {
        xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadPercent(percent);
        setMessage(`Đang upload video... ${percent}%`);
      };

      xhr.onload = () => {
        try {
          const text = xhr.responseText || "";
          const data = text ? JSON.parse(text) : {};
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            resolve(data);
          } else {
            reject(new Error(data.message || `Upload video thất bại (${xhr.status})`));
          }
        } catch (err) {
          reject(new Error("Response upload video không hợp lệ"));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Không thể kết nối API upload video. Kiểm tra domain / backend / CORS."));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload video bị timeout"));
      };

      xhr.timeout = 1000 * 60 * 20;
      xhr.send(fd);
    });
  };

  const checkMovieStatus = async (targetMovieId) => {
    const res = await fetch(`${API_URL}/upload/status/${targetMovieId}`, {
      headers: { ...getAuthHeaders() },
    });

    const data = await parseJsonSafe(res);

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Không lấy được trạng thái xử lý video");
    }

    return data.movie;
  };

  const fetchQueueSnapshot = async ({ silent = false } = {}) => {
    if (!authToken) return null;
    if (!silent) setQueueLoading(true);

    try {
      const res = await fetch(`${API_URL}/upload/queue`, {
        headers: { ...getAuthHeaders() },
      });
      const data = await parseJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Khong lay duoc queue");
      }

      setQueueSnapshot(data);
      return data;
    } catch (err) {
      console.error("fetchQueueSnapshot error:", err);
      return null;
    } finally {
      if (!silent) setQueueLoading(false);
    }
  };

  const handleReprocessMedia = async (targetMovieId, options = {}) => {
    const resolvedMovieId = String(targetMovieId || movieId || "").trim();
    if (!resolvedMovieId) {
      setReprocessState({
        loading: false,
        message: "Nhap movie ID de reprocess media",
      });
      return;
    }

    setReprocessState({
      loading: true,
      message: "Dang reprocess poster/backdrop/preview...",
    });

    try {
      const res = await fetch(
        `${API_URL}/upload/reprocess-media/${resolvedMovieId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(options),
        }
      );

      const data = await parseJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Reprocess that bai");
      }

      setReprocessState({
        loading: false,
        message: "Reprocess xong. Poster/backdrop/preview da duoc cap nhat.",
      });
    } catch (err) {
      setReprocessState({
        loading: false,
        message: err.message || "Reprocess that bai",
      });
    }
  };

  const startPolling = (targetMovieId) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const movie = await checkMovieStatus(targetMovieId);
        const currentStatus = movie?.status || "";

        setJobStatus(currentStatus);

        if (currentStatus === "queued") {
          setMessage("Video đang ở hàng chờ xử lý...");
          return;
        }

        if (currentStatus === "processing") {
          setMessage("Video đang được convert HLS ở background...");
          return;
        }

        if (currentStatus === "ready") {
          setMessage("Video đã xử lý xong");
          clearInterval(pollRef.current);
          pollRef.current = null;
          setTimeout(() => {
            navigate(`/movie/${movie?.slug || targetMovieId}`);
          }, 800);
          return;
        }

        if (currentStatus === "failed") {
          setMessage(movie?.processingError || "Xử lý video thất bại");
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (err) {
        console.error("Polling status error:", err);
      }
    }, 5000);
  };

  useEffect(() => {
    batchFilesRef.current = batchFiles;
  }, [batchFiles]);

  useEffect(() => {
    const nextArea = forcedContentArea === "world" ? "world" : "default";
    setForm((prev) => ({ ...prev, contentArea: nextArea }));
    setBatchSeries((prev) => ({ ...prev, contentArea: nextArea }));

    if (forcedContentArea === "world") {
      setMode("batch");
      return;
    }
    setMode("single");
  }, [forcedContentArea]);

  useEffect(() => {
    if (movieId) {
      setManualReprocessId(movieId);
    }
  }, [movieId]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (batchPollRef.current) clearInterval(batchPollRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (posterFile && posterPreviewSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(posterPreviewSrc);
      }
    };
  }, [posterFile, posterPreviewSrc]);

  useEffect(() => {
    return () => {
      if (backdropFile && backdropPreviewSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(backdropPreviewSrc);
      }
    };
  }, [backdropFile, backdropPreviewSrc]);

  const getBatchEpisodeLabel = (item, index) => {
    const customLabel =
      typeof item?.episodeLabel === "string" ? item.episodeLabel.trim() : "";
    return customLabel || `Tập ${index + 1}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!authToken) {
      setMessage("Thiếu token đăng nhập admin");
      return;
    }

    setLoading(true);
    setMessage("");
    setUploadPercent(0);
    setMovieId("");
    setJobStatus("");

    try {
      await wakeServer();

      let posterUrl = form.poster.trim();
      let backdropUrl = form.backdrop.trim();

      if (posterFile) {
        setMessage("Đang upload poster...");
        posterUrl = await uploadImage(posterFile);
      }

      if (backdropFile) {
        setMessage("Đang upload backdrop...");
        backdropUrl = await uploadImage(backdropFile);
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        poster: posterUrl,
        backdrop: backdropUrl,
        genre: form.genre.split(",").map((x) => x.trim()).filter(Boolean),
        country: form.country.trim(),
        year: form.year ? Number(form.year) : null,
        rating: form.rating ? Number(form.rating) : 0,
        duration: form.duration ? Number(form.duration) : 0,
        contentArea: isWorldAdmin ? "world" : "default",
        isPublished: form.isPublished,
        ...(form.seriesId.trim() && {
          seriesId:     form.seriesId.trim(),
          seriesTitle:  form.seriesTitle.trim(),
          season:       Number(form.season) || 1,
          episode:      Number(form.episode) || 1,
          episodeLabel: form.episodeLabel.trim(),
          episodeTitle: form.episodeTitle.trim(),
        }),
      };

      setMessage("Đang tạo movie...");

      const createRes = await fetch(`${API_URL}/movies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });

      const createData = await parseJsonSafe(createRes);

      if (!createRes.ok || !createData.success) {
        throw new Error(createData.message || "Tạo movie thất bại");
      }

      const newMovieId = createData.movie?._id;
      const newMovieSlug = createData.movie?.slug;
      if (!newMovieId) {
        throw new Error("Không lấy được movieId");
      }

      setMovieId(newMovieId);

      if (videoFile) {
        setMessage("Đang upload video lên storage...");
        const uploadData = await uploadVideoViaPresign(newMovieId, videoFile, {
          onProgress: (pct) => {
            setUploadPercent(pct);
            setMessage(`Đang upload video... ${pct}%`);
          },
        });

        if (!uploadData?.success) {
          throw new Error("Không đưa được video vào background queue");
        }

        setJobStatus("queued");
        setMessage("Upload video xong, đang chờ xử lý nền...");
        startPolling(newMovieId);
      } else {
        setMessage("Tạo movie thành công");
        setTimeout(() => {
          navigate(`/movie/${newMovieSlug || newMovieId}`);
        }, 700);
      }
    } catch (err) {
      console.error("AdminNewMovie error:", err);
      setMessage(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  // -- Batch helpers --
  const reindexBatchFiles = (items) =>
    items.map((item, index) => ({ ...item, episode: index + 1 }));

  const handleBatchFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    addBatchAssets(files);
    e.target.value = "";
  };

  const handleBatchFolderChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    addBatchAssets(
      files.map((file) => ({ file, relativePath: getBatchEntryPath(file) }))
    );
    e.target.value = "";
  };

  const updateBatchFile = (index, patch) => {
    setBatchFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const moveBatchFile = (index, direction) => {
    setBatchFiles((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return reindexBatchFiles(next);
    });
  };

  const removeBatchFile = (index) => {
    setBatchFiles((prev) => reindexBatchFiles(prev.filter((_, i) => i !== index)));
  };

  const clearBatchImages = () => {
    setBatchImageFiles([]);
  };

  const handleBatchImagePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    addBatchAssets(files);
    e.target.value = "";
  };

  const syncBatchProcessingStatus = async () => {
    const currentItems = batchFilesRef.current || [];
    const activeItems = currentItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.movieId && !["done", "error"].includes(item.status));

    if (activeItems.length === 0) {
      if (batchPollRef.current) {
        clearInterval(batchPollRef.current);
        batchPollRef.current = null;
      }
      return;
    }

    const CONCURRENT_LIMIT = 3;
    for (let i = 0; i < activeItems.length; i += CONCURRENT_LIMIT) {
      const chunk = activeItems.slice(i, i + CONCURRENT_LIMIT);
      await Promise.all(
        chunk.map(async ({ item, index }) => {
          try {
            const movie = await checkMovieStatus(item.movieId);
            const nextStatus = movie?.status || item.status;

            if (nextStatus === "ready") {
              updateBatchFile(index, { status: "done", percent: 100, error: "" });
              return;
            }

            if (nextStatus === "failed") {
              updateBatchFile(index, {
                status: "error",
                error: movie?.processingError || "Xử lý video thất bại",
              });
              return;
            }

            if (nextStatus === "processing" || nextStatus === "queued") {
              // Chỉ update nếu status thực sự thay đổi — tránh re-render vô nghĩa
              // làm reset interval liên tục (tạo polling loop ~400ms thay vì 6s)
              if (nextStatus !== item.status) {
                updateBatchFile(index, { status: nextStatus, error: "" });
              }
            }
          } catch (err) {
            console.error("syncBatchProcessingStatus error:", err);
          }
        })
      );
    }
  };

  useEffect(() => {
    const hasPendingProcessing = batchFiles.some(
      (item) => item.movieId && ["queued", "processing"].includes(item.status)
    );

    if (!hasPendingProcessing) {
      if (batchPollRef.current) {
        clearInterval(batchPollRef.current);
        batchPollRef.current = null;
      }
      return;
    }

    syncBatchProcessingStatus();

    const pollInterval = batchFiles.length > 10 ? 10000 : 6000;
    if (batchPollRef.current) clearInterval(batchPollRef.current);
    batchPollRef.current = setInterval(syncBatchProcessingStatus, pollInterval);

    return () => {
      if (batchPollRef.current) {
        clearInterval(batchPollRef.current);
        batchPollRef.current = null;
      }
    };
  }, [batchFiles]);

  useEffect(() => {
    if (batchFiles.length === 0) {
      if (!batchLoading) setBatchStatusMessage("");
      return;
    }

    if (batchLoading) return;

    const doneCount = batchFiles.filter((item) => item.status === "done").length;
    const errorCount = batchFiles.filter((item) => item.status === "error").length;
    const processingCount = batchFiles.filter((item) =>
      ["queued", "processing"].includes(item.status)
    ).length;

    if (processingCount > 0) {
      setBatchStatusMessage(
        `Đã xử lý xong ${doneCount}/${batchFiles.length} tập. Đang chờ ${processingCount} tập tiếp theo...`
      );
      return;
    }

    if (doneCount + errorCount === batchFiles.length) {
      setBatchStatusMessage(
        errorCount > 0
          ? `Hoàn tất ${doneCount}/${batchFiles.length} tập, có ${errorCount} tập lỗi.`
          : `Đã xử lý xong toàn bộ ${doneCount}/${batchFiles.length} tập.`
      );
    }
  }, [batchFiles, batchLoading]);

  useEffect(() => {
    if (!authToken) return undefined;

    fetchQueueSnapshot({ silent: false });

    const intervalId = setInterval(() => {
      fetchQueueSnapshot({ silent: true });
    }, 8000);

    return () => clearInterval(intervalId);
  }, [authToken]);

  const handleBatchUpload = async () => {
    if (!batchSeries.seriesId.trim()) { alert("Nhập Series ID trước"); return; }
    if (!batchSeries.seriesTitle.trim()) { alert("Nhập Tên seri trước"); return; }
    if (batchFiles.length === 0) { alert("Chọn ít nhất 1 video"); return; }
    if (!authToken) { alert("Thiếu token admin"); return; }

    if (batchMergeOptions.enabled) {
      setBatchLoading(true);
      setBatchStatusMessage("");
      await wakeServer();

      try {
        const payload = {
          title: batchSeries.seriesTitle.trim(),
          seriesId: batchSeries.seriesId.trim(),
          seriesTitle: batchSeries.seriesTitle.trim(),
          season: Number(batchSeries.season) || 1,
          episode: 1,
          genre: batchSeries.genre.split(",").map((x) => x.trim()).filter(Boolean),
          year: batchSeries.year ? Number(batchSeries.year) : null,
          rating: batchSeries.rating ? Number(batchSeries.rating) : 0,
          contentArea: isWorldAdmin ? "world" : "default",
          isPublished: batchSeries.isPublished,
          country: batchSeries.country || "",
        };

        setBatchStatusMessage("Đang tạo movie...");
        const createRes = await fetch(`${API_URL}/movies`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });
        const createData = await parseJsonSafe(createRes);
        if (!createRes.ok || !createData.success)
          throw new Error(createData.message || "Tạo movie thất bại");

        const newId = createData.movie._id;
        setBatchFiles((prev) => prev.map((item) => ({ ...item, movieId: newId, status: "uploading" })));
        setBatchStatusMessage(`Đang upload ${batchFiles.length} video để ghép thành 1 phim...`);

        const mergeFiles = batchFiles.map((item) => item.file);
        const uploadData =
          mergeFiles.length === 1
            ? await uploadVideoWithProgress(newId, mergeFiles[0])
            : await uploadMultipleVideosWithProgress(newId, mergeFiles, {
                targetDuration: batchMergeOptions.targetDuration,
                sortBy: batchMergeOptions.sortBy,
              });

        if (!uploadData?.success) throw new Error("Upload thất bại");

        setBatchFiles((prev) => prev.map((item) => ({ ...item, status: "queued", percent: 100 })));
        setBatchStatusMessage(
          `Đã upload ${batchFiles.length} video. Đang ghép và xử lý HLS nền...`
        );

        if (batchImageFiles.length > 0) {
          try {
            await uploadMovieImages(newId, batchImageFiles);
          } catch (err) {
            console.warn("Upload ảnh merge mode lỗi:", err.message);
          }
        }
      } catch (err) {
        setBatchStatusMessage(`Lỗi: ${err.message}`);
        setBatchFiles((prev) =>
          prev.map((item) => ({ ...item, status: "error", error: err.message }))
        );
      } finally {
        setBatchLoading(false);
      }
      return;
    }

    // BATCH MODE: mỗi video = 1 tập riêng
    setBatchLoading(true);
    setBatchStatusMessage("");
    await wakeServer();
    const createdMovieIds = [];

    for (let i = 0; i < batchFiles.length; i++) {
      const item = batchFiles[i];
      const episodeLabel = getBatchEpisodeLabel(item, i);
      setBatchStatusMessage(`Đang upload video ${i + 1}/${batchFiles.length}: ${episodeLabel}`);
      updateBatchFile(i, { status: "uploading", error: "" });

      try {
        const payload = {
          title: `${batchSeries.seriesTitle} - Tập ${item.episode}`,
          seriesId:     batchSeries.seriesId.trim(),
          seriesTitle:  batchSeries.seriesTitle.trim(),
          season:       Number(batchSeries.season) || 1,
          episode:      i + 1,
          episodeLabel: item.episodeLabel.trim(),
          episodeTitle: item.episodeTitle.trim(),
          genre:        batchSeries.genre.split(",").map((x) => x.trim()).filter(Boolean),
          year:         batchSeries.year   ? Number(batchSeries.year)   : null,
          rating:       batchSeries.rating ? Number(batchSeries.rating) : 0,
          contentArea:  isWorldAdmin ? "world" : "default",
          isPublished:  batchSeries.isPublished,
          country:      batchSeries.country || "",
        };

        const createRes = await fetch(`${API_URL}/movies`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });
        const createData = await parseJsonSafe(createRes);
        if (!createRes.ok || !createData.success)
          throw new Error(createData.message || "Tạo movie thất bại");

        const newId = createData.movie._id;
        createdMovieIds.push(newId);
        updateBatchFile(i, { movieId: newId });

        await uploadVideoViaPresign(newId, item.file, {
          onProgress: (pct) => updateBatchFile(i, { percent: pct }),
          isBatch: true,
        });

        updateBatchFile(i, { status: "queued", percent: 100 });
        setBatchStatusMessage(`Đã đưa ${i + 1}/${batchFiles.length} video vào hàng chờ xử lý`);
      } catch (err) {
        updateBatchFile(i, { status: "error", error: err.message });
      }
    }

    if (createdMovieIds.length > 0 && batchImageFiles.length > 0) {
      try {
        setBatchStatusMessage(`Đang upload ${batchImageFiles.length} ảnh gallery cho seri...`);
        await uploadMovieImages(createdMovieIds[0], batchImageFiles);
      } catch (err) {
        setBatchStatusMessage(`Video đã upload xong, nhưng upload ảnh lỗi: ${err.message}`);
      }
    }

    setBatchLoading(false);
    setBatchStatusMessage(
      `Đã upload xong ${batchFiles.length} video${
        batchImageFiles.length ? ` + ${batchImageFiles.length} ảnh` : ""
      }. Đang đợi xử lý HLS...`
    );
  };

  return (
    <div style={{ background: "#111", minHeight: "100vh", color: "#fff", padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: 760, margin: "0 auto", background: "#181818",
          padding: 24, borderRadius: 12, border: "1px solid #2a2a2a",
        }}
      >
        <h1 style={{ marginBottom: 16 }}>
          {isWorldAdmin ? "Admin - Thế giới" : "Admin - Tạo Movie"}
        </h1>

        {isWorldAdmin && (
          <p style={{ marginTop: -6, marginBottom: 18, color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Video upload tại đây sẽ hiện trong mục Thế giới, phù hợp cho nội dung rất nhiều tập và nhiều ảnh.
          </p>
        )}

        <div
          style={{
            display: "grid",
            gap: 10,
            marginBottom: 18,
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ fontSize: 14 }}>Background queue</strong>
            <button
              type="button"
              onClick={() => fetchQueueSnapshot({ silent: false })}
              disabled={queueLoading}
              style={miniButtonStyle(queueLoading)}
            >
              {queueLoading ? "Dang tai..." : "Lam moi"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            <div style={statusTileStyle}>
              <span style={statusTileLabelStyle}>Dang chay</span>
              <strong>{queueSnapshot?.running ? "Co" : "Khong"}</strong>
            </div>
            <div style={statusTileStyle}>
              <span style={statusTileLabelStyle}>Dang doi</span>
              <strong>{queueSnapshot?.waiting ?? 0}</strong>
            </div>
            <div style={statusTileStyle}>
              <span style={statusTileLabelStyle}>Job hien tai</span>
              <strong style={{ fontSize: 12 }}>
                {queueSnapshot?.activeJob?.title || queueSnapshot?.activeJob?.movieId || "--"}
              </strong>
            </div>
          </div>

          {Array.isArray(queueSnapshot?.waitingJobs) && queueSnapshot.waitingJobs.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              {queueSnapshot.waitingJobs.slice(0, 5).map((job, index) => (
                <div
                  key={`${job.movieId || "job"}-${index}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.72)",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <span>{job.title || job.movieId || `Job ${index + 1}`}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{job.type || "video-process"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[["single", "Phim lẻ"], ["batch", "Upload Seri (nhiều tập)"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 14,
                background: mode === key ? "#e50914" : "rgba(255,255,255,0.08)",
                color: "#fff",
              }}
            >{label}</button>
          ))}
        </div>

        {/* BATCH SERIES MODE */}
        {mode === "batch" && (
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 4 }}>
              Chọn nhiều file MP4 – mỗi file = 1 tập. Upload tuần tự tự động.
            </p>

            <input
              name="seriesId"
              placeholder='Series ID – dùng chung cho tất cả tập (VD: "ten-seri-abc")'
              value={batchSeries.seriesId}
              onChange={(e) => setBatchSeries((p) => ({ ...p, seriesId: e.target.value }))}
              style={inputStyle}
            />

            <input
              name="seriesTitle"
              placeholder="Tên seri đầy đủ (VD: Phim Hay Mùa 1)"
              value={batchSeries.seriesTitle}
              onChange={(e) => setBatchSeries((p) => ({ ...p, seriesTitle: e.target.value }))}
              style={inputStyle}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <input name="season" type="number" min="1" placeholder="Mùa (Season)"
                value={batchSeries.season}
                onChange={(e) => setBatchSeries((p) => ({ ...p, season: e.target.value }))}
                style={inputStyle} />
              <input name="genre" placeholder="Genre (Action, Drama...)"
                value={batchSeries.genre}
                onChange={(e) => setBatchSeries((p) => ({ ...p, genre: e.target.value }))}
                style={inputStyle} />
              <input name="year" placeholder="Năm"
                value={batchSeries.year}
                onChange={(e) => setBatchSeries((p) => ({ ...p, year: e.target.value }))}
                style={inputStyle} />
            </div>

            {isWorldAdmin && (
              <select
                value={batchSeries.country}
                onChange={(e) => setBatchSeries((p) => ({ ...p, country: e.target.value }))}
                style={inputStyle}
              >
                <option value="">-- Quốc gia / Khu vực --</option>
                <option value="Trung Quốc">Trung Quốc</option>
                <option value="Nhật Bản">Nhật Bản</option>
                <option value="Hàn Quốc">Hàn Quốc</option>
                <option value="Thái Lan">Thái Lan</option>
                <option value="Indonesia">Indonesia</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Châu Âu">Châu Âu</option>
                <option value="Khác">Khác</option>
              </select>
            )}

            <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
              Chọn nhiều file video (MP4):
            </label>
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <input
                ref={batchFileInputRef}
                type="file"
                accept="video/mp4,video/x-matroska,video/webm,video/quicktime"
                multiple
                onChange={handleBatchFilesChange}
                style={{ display: "none" }}
              />
              {isWorldAdmin && (
                <input
                  ref={batchFolderInputRef}
                  type="file"
                  multiple
                  webkitdirectory=""
                  directory=""
                  onChange={handleBatchFolderChange}
                  style={{ display: "none" }}
                />
              )}
              <button
                type="button"
                onClick={() => batchFileInputRef.current?.click()}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff", borderRadius: 8, padding: "8px 14px",
                  cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap",
                }}
              >
                + Chọn tệp
              </button>
              {isWorldAdmin && (
                <button
                  type="button"
                  onClick={() => batchFolderInputRef.current?.click()}
                  style={{
                    border: "1px solid rgba(74,222,128,0.24)",
                    background: "rgba(22,101,52,0.22)",
                    color: "#fff", borderRadius: 8, padding: "8px 14px",
                    cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap",
                  }}
                >
                  + Chọn folder TG
                </button>
              )}
              <span style={{ color: batchFiles.length > 0 ? "#fff" : "rgba(255,255,255,0.65)", fontSize: 14 }}>
                {batchFiles.length > 0
                  ? `Đã chọn ${batchFiles.length} video`
                  : "Chưa có tệp nào được chọn"}
              </span>
              {isWorldAdmin && batchImageFiles.length > 0 && (
                <span style={{ color: "rgba(255,255,255,0.82)", fontSize: 14 }}>
                  + {batchImageFiles.length} ảnh gallery
                </span>
              )}
            </div>

            {batchFiles.length > 0 && (
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: -4 }}>
                Bạn có thể chọn nhiều video cùng lúc, rồi tự chỉnh số tập ở danh sách bên dưới.
              </p>
            )}

            {batchFiles.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  {batchFiles.length} file – chỉnh số tập và tên tập nếu cần:
                </p>
                {batchFiles.map((item, i) => {
                  const statusColor = {
                    pending: "#aaa", uploading: "#f5c542", processing: "#a78bfa",
                    queued: "#38bdf8", done: "#4ade80", error: "#f87171",
                  }[item.status] || "#aaa";
                  return (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "90px 1.2fr 1fr 1fr auto",
                      gap: 8, alignItems: "center",
                      background: "rgba(255,255,255,0.04)", padding: "10px 12px",
                      borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      <input
                        type="number" min="1" value={i + 1} readOnly tabIndex={-1}
                        style={{ ...inputStyle, padding: "6px 8px", textAlign: "center", fontWeight: 700 }}
                        title="Số tập"
                      />
                      <span style={{ fontSize: 12, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.sourcePath || item.file.name}
                      </span>
                      <input
                        placeholder="Nhãn tập (abc, xyz...)"
                        value={item.episodeLabel}
                        onChange={(e) => updateBatchFile(i, { episodeLabel: e.target.value })}
                        style={{ ...inputStyle, padding: "6px 10px" }}
                      />
                      <input
                        placeholder="Tên tập (tuỳ chọn)"
                        value={item.episodeTitle}
                        onChange={(e) => updateBatchFile(i, { episodeTitle: e.target.value })}
                        style={{ ...inputStyle, padding: "6px 10px" }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, whiteSpace: "nowrap" }}>
                          {item.status === "uploading" ? `${item.percent}%` : item.status}
                          {item.error ? ` ✗ ${item.error}` : ""}
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button type="button" disabled={batchLoading || i === 0}
                            onClick={() => moveBatchFile(i, -1)}
                            style={miniButtonStyle(batchLoading || i === 0)}>
                            Lên
                          </button>
                          <button type="button" disabled={batchLoading || i === batchFiles.length - 1}
                            onClick={() => moveBatchFile(i, 1)}
                            style={miniButtonStyle(batchLoading || i === batchFiles.length - 1)}>
                            Xuống
                          </button>
                          <button type="button" disabled={batchLoading}
                            onClick={() => removeBatchFile(i)}
                            style={miniDangerButtonStyle(batchLoading)}>
                            Xoá
                          </button>
                        </div>
                        {item.movieId && ["queued", "processing", "done"].includes(item.status) && (
                          <a href={`/movie/${item.movieId}`} target="_blank" rel="noreferrer"
                            style={{
                              fontSize: 11, color: "#4ade80", textDecoration: "none",
                              background: "rgba(74,222,128,0.12)", borderRadius: 6,
                              padding: "3px 8px", whiteSpace: "nowrap",
                            }}>
                            📸 Thêm ảnh
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isWorldAdmin && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleBatchDrop}
                style={{
                  border: "1px dashed rgba(74,222,128,0.28)", borderRadius: 12,
                  padding: "16px 18px", background: "rgba(14,30,22,0.38)",
                  color: "rgba(255,255,255,0.72)", fontSize: 13,
                }}
              >
                Kéo cả folder vào đây để lấy luôn video + ảnh. Ảnh sẽ được gắn
                chung cho seri và video sẽ tự tách thành danh sách tập.
              </div>
            )}

            {isWorldAdmin && (
              <div style={{
                display: "grid", gap: 10, background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13, color: "#fff" }}>
                    Ảnh gallery chung{batchImageFiles.length > 0 ? `: ${batchImageFiles.length} ảnh` : ""}
                  </strong>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      ref={batchImageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleBatchImagePick}
                    />
                    <button
                      type="button"
                      disabled={batchLoading}
                      onClick={() => batchImageInputRef.current?.click()}
                      style={{
                        background: "#1d4ed8", color: "#fff", border: "none",
                        padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                      }}
                    >
                      + Chọn ảnh
                    </button>
                    {batchImageFiles.length > 0 && (
                      <button type="button" onClick={clearBatchImages} disabled={batchLoading}
                        style={miniDangerButtonStyle(batchLoading)}>
                        Xoá ảnh
                      </button>
                    )}
                  </div>
                </div>

                {batchImageFiles.length > 0 ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: 6,
                  }}>
                    {batchImageFiles.map((item, i) => (
                      <img
                        key={item.sourceKey || i}
                        src={URL.createObjectURL(item.file)}
                        alt=""
                        style={{
                          width: "100%", aspectRatio: "16/9", objectFit: "cover",
                          borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                    Chưa có ảnh. Bấm "+ Chọn ảnh" hoặc kéo folder chứa ảnh vào ô trên.
                  </p>
                )}
              </div>
            )}

            {/* Merge mode */}
            <div style={{
              background: "rgba(245,197,66,0.06)",
              border: "1px solid rgba(245,197,66,0.2)",
              borderRadius: 10, padding: "14px 16px",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={batchMergeOptions.enabled}
                  onChange={(e) =>
                    setBatchMergeOptions((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  style={{ width: 16, height: 16, accentColor: "#f5c542", cursor: "pointer" }}
                />
                <span style={{ fontWeight: 700, color: "#f5c542", fontSize: 14 }}>
                  Ghép nhiều video ngắn thành 1 phim dài (Merge Mode)
                </span>
              </label>

              {batchMergeOptions.enabled && (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
                      Thời lượng mục tiêu (giây)
                    </p>
                    <input
                      type="number" min="60"
                      value={batchMergeOptions.targetDuration}
                      onChange={(e) =>
                        setBatchMergeOptions((prev) => ({
                          ...prev,
                          targetDuration: parseInt(e.target.value) || 900,
                        }))
                      }
                      style={inputStyle}
                    />
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                      900 = 15 phút &bull; 1800 = 30 phút
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
                      Sắp xếp video theo
                    </p>
                    <select
                      value={batchMergeOptions.sortBy}
                      onChange={(e) =>
                        setBatchMergeOptions((prev) => ({ ...prev, sortBy: e.target.value }))
                      }
                      style={{ ...inputStyle }}
                    >
                      <option value="name">Tên file (A-Z)</option>
                      <option value="time">Thời gian tạo file</option>
                    </select>
                  </div>
                </div>
              )}

              {batchMergeOptions.enabled && batchFiles.length > 0 && (
                <p style={{ fontSize: 12, color: "rgba(245,197,66,0.75)", marginTop: 10 }}>
                  Tất cả {batchFiles.length} video sẽ được ghép thành 1 phim duy nhất.
                  Phù hợp khi có nhiều clip ngắn cùng nội dung.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={batchLoading || batchFiles.length === 0}
              onClick={handleBatchUpload}
              style={{
                background: batchLoading ? "#555" : "#e50914",
                color: "#fff", border: "none", padding: "13px 18px",
                borderRadius: 8, cursor: batchLoading ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 15,
              }}
            >
              {batchLoading
                ? `Đang upload... (${batchFiles.filter(f => f.status === "queued" || f.status === "done").length}/${batchFiles.length} tập)`
                : `📤 Upload ${batchFiles.length || ""} tập`}
            </button>

            {!!batchStatusMessage && (
              <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                {batchStatusMessage}
              </p>
            )}
          </div>
        )}

        {/* SINGLE MOVIE MODE */}
        {mode === "single" && (<>

        {/* TMDB auto-fill */}
        <div style={{ position: "relative", marginBottom: 18 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(1,180,228,0.07)", border: "1px solid rgba(1,180,228,0.22)",
            borderRadius: 10, padding: "10px 14px",
          }}>
            <span style={{ fontSize: 18 }}>🎬</span>
            <input
              placeholder="Tìm phim trên TMDB để tự điền thông tin..."
              value={tmdbQuery}
              onChange={handleTmdbInput}
              onFocus={() => tmdbQuery.trim() && setTmdbOpen(true)}
              style={{ ...inputStyle, border: "none", background: "transparent", padding: "0", flex: 1 }}
            />
            {tmdbLoading && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Đang tìm...</span>}
            {tmdbQuery && (
              <button type="button" onClick={() => { setTmdbQuery(""); setTmdbResults([]); setTmdbOpen(false); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>
                ×
              </button>
            )}
          </div>

          {tmdbOpen && tmdbResults.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
              background: "#1a1a1a", border: "1px solid #333", borderRadius: 10,
              overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}>
              {tmdbResults.map((r) => (
                <button key={r.tmdbId} type="button" onClick={() => applyTmdb(r)}
                  style={{
                    display: "flex", gap: 12, alignItems: "center", width: "100%",
                    padding: "10px 14px", background: "none", border: "none",
                    borderBottom: "1px solid #2a2a2a", cursor: "pointer", textAlign: "left",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
                  {r.poster
                    ? <img src={r.poster} alt="" style={{ width: 38, height: 56, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                    : <div style={{ width: 38, height: 56, background: "#333", borderRadius: 4, flexShrink: 0 }} />
                  }
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                      {r.year}{r.rating ? ` · ⭐ ${r.rating}` : ""}{r.genres?.length ? ` · ${r.genres.slice(0,2).join(", ")}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {message && (
          <p style={{ marginBottom: 12, color: "#f5c542", fontWeight: 700 }}>
            {message}
          </p>
        )}

        {!!movieId && (
          <div style={{
            marginBottom: 16, padding: "10px 12px",
            background: "#121826", border: "1px solid #26314d",
            borderRadius: 8, fontSize: 14,
          }}>
            <div>Movie ID: {movieId}</div>
            <div>Status: {jobStatus || "created"}</div>
          </div>
        )}

        {!!uploadPercent && uploadPercent <= 100 && (
          <div style={{
            width: "100%", height: 10, background: "#2b2b2b",
            borderRadius: 999, overflow: "hidden", marginBottom: 16,
          }}>
            <div style={{
              width: `${uploadPercent}%`, height: "100%",
              background: "#e50914", transition: "width 0.2s ease",
            }} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <input name="title" placeholder="Title" value={form.title} onChange={handleChange} required style={inputStyle} />
          <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} rows={4} style={inputStyle} />
          <input name="poster" placeholder="Poster URL" value={form.poster} onChange={handleChange} style={inputStyle} />
          <input type="file" accept="image/*" onChange={(e) => setPosterFile(e.target.files?.[0] || null)} style={inputStyle} />
          <input name="backdrop" placeholder="Backdrop URL" value={form.backdrop} onChange={handleChange} style={inputStyle} />
          <input type="file" accept="image/*" onChange={(e) => setBackdropFile(e.target.files?.[0] || null)} style={inputStyle} />

          {(posterPreviewSrc || backdropPreviewSrc) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.35fr",
                gap: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div>
                <p style={previewLabelStyle}>Poster preview</p>
                <div style={{ ...previewFrameStyle, aspectRatio: "2 / 3" }}>
                  {posterPreviewSrc ? (
                    <img src={posterPreviewSrc} alt="poster preview" style={previewImageStyle} />
                  ) : (
                    <span style={previewHintStyle}>Chua co poster</span>
                  )}
                </div>
              </div>
              <div>
                <p style={previewLabelStyle}>Backdrop preview</p>
                <div style={{ ...previewFrameStyle, aspectRatio: "16 / 9" }}>
                  {backdropPreviewSrc ? (
                    <img src={backdropPreviewSrc} alt="backdrop preview" style={previewImageStyle} />
                  ) : (
                    <span style={previewHintStyle}>Chua co backdrop</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Seri */}
          <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 14 }}>
            <p style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>
              📺 Seri phim (để trống nếu là phim lẻ)
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                name="seriesId"
                placeholder='Series ID – chung cho tất cả tập (VD: "ten-seri-abc")'
                value={form.seriesId} onChange={handleChange} style={inputStyle}
              />
              <input
                name="seriesTitle"
                placeholder="Tên seri đầy đủ (VD: Phim Hay Mùa 1)"
                value={form.seriesTitle} onChange={handleChange} style={inputStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input name="season" type="number" min="1" placeholder="Mùa (Season)" value={form.season} onChange={handleChange} style={inputStyle} />
                <input name="episode" type="number" min="1" placeholder="Số tập (Episode)" value={form.episode} onChange={handleChange} style={inputStyle} />
              </div>
              <input name="episodeLabel" placeholder="Nhãn tập hiển thị (VD: abc, xyz, Ngoại truyện)" value={form.episodeLabel} onChange={handleChange} style={inputStyle} />
              <input name="episodeTitle" placeholder="Tên tập (VD: Khởi Đầu)" value={form.episodeTitle} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <input name="genre" placeholder="Genre (ví dụ Action, Drama)" value={form.genre} onChange={handleChange} style={inputStyle} />
          <input name="country" placeholder="Country / Khu vuc" value={form.country} onChange={handleChange} style={inputStyle} />
          <input name="year" placeholder="Year" value={form.year} onChange={handleChange} style={inputStyle} />
          <input name="rating" placeholder="Rating" value={form.rating} onChange={handleChange} style={inputStyle} />
          <input name="duration" placeholder="Duration" value={form.duration} onChange={handleChange} style={inputStyle} />

          {!isWorldAdmin && (
            <div style={{ ...inputStyle, color: "rgba(255,255,255,0.72)", display: "flex", alignItems: "center" }}>
              Khu vực: Nội dung thường
            </div>
          )}

          <input type="file" accept="video/mp4,video/x-matroska,video/webm,video/quicktime"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)} style={inputStyle} />

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" name="isPublished" checked={form.isPublished} onChange={handleChange} />
            Published
          </label>

          <button type="submit" disabled={loading}
            style={{
              background: "#e50914", color: "#fff", border: "none",
              padding: "12px 18px", borderRadius: 8, cursor: "pointer",
              fontWeight: 700, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Đang tạo..." : "Tạo Movie"}
          </button>
        </form>

        <div
          style={{
            marginTop: 22,
            paddingTop: 20,
            borderTop: "1px solid #2a2a2a",
            display: "grid",
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff" }}>
            Reprocess poster/backdrop cho video cu
          </h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
            Dung lai engine poster generator v2 va backdrop generator cho movie da co HLS.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto auto", gap: 10 }}>
            <input
              value={manualReprocessId}
              onChange={(e) => setManualReprocessId(e.target.value)}
              placeholder="Movie ID can reprocess"
              style={inputStyle}
            />
            <button
              type="button"
              disabled={reprocessState.loading}
              onClick={() => handleReprocessMedia(manualReprocessId, { poster: true, backdrop: false, preview: true })}
              style={miniButtonStyle(reprocessState.loading)}
            >
              Poster
            </button>
            <button
              type="button"
              disabled={reprocessState.loading}
              onClick={() => handleReprocessMedia(manualReprocessId, { poster: false, backdrop: true, preview: false })}
              style={miniButtonStyle(reprocessState.loading)}
            >
              Backdrop
            </button>
            <button
              type="button"
              disabled={reprocessState.loading}
              onClick={() => handleReprocessMedia(manualReprocessId, { poster: true, backdrop: true, preview: true })}
              style={{
                ...miniButtonStyle(reprocessState.loading),
                background: reprocessState.loading ? "rgba(255,255,255,0.06)" : "rgba(229,9,20,0.18)",
                border: reprocessState.loading ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(229,9,20,0.3)",
              }}
            >
              Full
            </button>
          </div>

          {reprocessState.message ? (
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.78)" }}>
              {reprocessState.message}
            </p>
          ) : null}
        </div>

        {!!movieId && (
          <div style={{ marginTop: 28, borderTop: "1px solid #2a2a2a", paddingTop: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, color: "#fff" }}>
              📸 Thêm ảnh cho video
            </h2>

            {galleryMessage && (
              <p style={{ marginBottom: 12, color: "#f5c542", fontWeight: 600, fontSize: 14 }}>
                {galleryMessage}
              </p>
            )}

            <input type="file" accept="image/*" multiple onChange={handleGalleryFileChange} style={inputStyle} />

            {galleryPreviews.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginTop: 12 }}>
                {galleryPreviews.map((src, i) => (
                  <img key={i} src={src} alt=""
                    style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6, border: "1px solid #333" }} />
                ))}
              </div>
            )}

            {uploadedImages.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
                  Đã upload ({uploadedImages.length} ảnh):
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                  {uploadedImages.map((src, i) => (
                    <img key={i} src={src} alt=""
                      style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6, border: "1px solid #2a4a2a" }} />
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={galleryUploading || galleryFiles.length === 0}
              onClick={uploadGalleryImages}
              style={{
                marginTop: 14,
                background: galleryFiles.length === 0 ? "#333" : "#1a6a3a",
                color: "#fff", border: "none", padding: "11px 18px",
                borderRadius: 8, cursor: galleryFiles.length === 0 ? "not-allowed" : "pointer",
                fontWeight: 700, opacity: galleryUploading ? 0.7 : 1,
              }}
            >
              {galleryUploading ? "Đang upload..." : `Upload ${galleryFiles.length} ảnh`}
            </button>
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#222",
  color: "#fff",
  outline: "none",
  fontFamily: "inherit",
  fontSize: 14,
};

const miniButtonStyle = (disabled) => ({
  border: "1px solid rgba(255,255,255,0.12)",
  background: disabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)",
  color: disabled ? "rgba(255,255,255,0.35)" : "#fff",
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 11,
  cursor: disabled ? "not-allowed" : "pointer",
});

const miniDangerButtonStyle = (disabled) => ({
  ...miniButtonStyle(disabled),
  background: disabled ? "rgba(255,255,255,0.06)" : "rgba(229,9,20,0.18)",
  border: disabled ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(229,9,20,0.32)",
});

const statusTileStyle = {
  display: "grid",
  gap: 6,
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const statusTileLabelStyle = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.45)",
};

const previewLabelStyle = {
  margin: "0 0 8px",
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(255,255,255,0.72)",
};

const previewFrameStyle = {
  width: "100%",
  borderRadius: 10,
  overflow: "hidden",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const previewImageStyle = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover",
};

const previewHintStyle = {
  color: "rgba(255,255,255,0.4)",
  fontSize: 12,
};
