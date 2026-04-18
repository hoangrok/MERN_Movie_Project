import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { API_URL } from "../utils/api";

export default function AdminNewMovie() {
  const navigate = useNavigate();
  const authState = useSelector((state) => state.auth);

  const authToken =
    authState?.token || authState?.user?.token || authState?.user?.accessToken || "";

  const [form, setForm] = useState({
    title: "",
    description: "",
    poster: "",
    backdrop: "",
    genre: "",
    year: "",
    rating: "",
    duration: "",
    isPublished: true,
  });

  const [posterFile, setPosterFile] = useState(null);
  const [backdropFile, setBackdropFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);

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

  const getAuthHeaders = () => {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  };

  const getBaseOrigin = () => {
    return API_URL.replace(/\/api$/, "");
  };

  const wakeServer = async () => {
    const healthUrl = `${getBaseOrigin()}/health`;
    setMessage("Đang đánh thức server...");
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
      headers: {
        ...getAuthHeaders(),
      },
      body: fd,
    });

    const data = await parseJsonSafe(res);

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Upload ảnh thất bại");
    }

    return data.url;
  };

  const uploadVideoWithProgress = (movieId, file) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);

      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("video", file);

      xhr.open("POST", `${API_URL}/upload/video/${movieId}`, true);

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
        reject(
          new Error(
            "Không thể kết nối API upload video. Kiểm tra CORS / server sleep / backend log."
          )
        );
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload video bị timeout"));
      };

      xhr.timeout = 1000 * 60 * 20; // 20 phút
      xhr.send(fd);
    });
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
        genre: form.genre
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        year: form.year ? Number(form.year) : null,
        rating: form.rating ? Number(form.rating) : 0,
        duration: form.duration ? Number(form.duration) : 0,
        isPublished: form.isPublished,
      };

      setMessage("Đang tạo movie...");

      const createRes = await fetch(`${API_URL}/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const createData = await parseJsonSafe(createRes);

      if (!createRes.ok || !createData.success) {
        throw new Error(createData.message || "Tạo movie thất bại");
      }

      const movieId = createData.movie?._id;
      if (!movieId) {
        throw new Error("Không lấy được movieId");
      }

      if (videoFile) {
        setMessage("Chuẩn bị upload video...");
        await wakeServer();
        setMessage("Đang upload video...");
        await uploadVideoWithProgress(movieId, videoFile);
      }

      setMessage("Tạo movie thành công");

      setTimeout(() => {
        navigate(`/movie/${movieId}`);
      }, 700);
    } catch (err) {
      console.error("AdminNewMovie error:", err);
      setMessage(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#111",
        minHeight: "100vh",
        color: "#fff",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "#181818",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #2a2a2a",
        }}
      >
        <h1 style={{ marginBottom: 20 }}>Admin - Tạo Movie</h1>

        {message && (
          <p style={{ marginBottom: 16, color: "#f5c542", fontWeight: 600 }}>
            {message}
          </p>
        )}

        {!!uploadPercent && uploadPercent < 100 && (
          <div
            style={{
              width: "100%",
              height: 10,
              background: "#2b2b2b",
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: `${uploadPercent}%`,
                height: "100%",
                background: "#e50914",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <input
            name="title"
            placeholder="Title"
            value={form.title}
            onChange={handleChange}
            required
            style={inputStyle}
          />

          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            style={inputStyle}
          />

          <input
            name="poster"
            placeholder="Poster URL"
            value={form.poster}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
            style={inputStyle}
          />

          <input
            name="backdrop"
            placeholder="Backdrop URL"
            value={form.backdrop}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBackdropFile(e.target.files?.[0] || null)}
            style={inputStyle}
          />

          <input
            name="genre"
            placeholder="Genre (ví dụ: Action, Drama)"
            value={form.genre}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="year"
            placeholder="Year"
            value={form.year}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="rating"
            placeholder="Rating"
            value={form.rating}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="duration"
            placeholder="Duration"
            value={form.duration}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            type="file"
            accept="video/mp4,video/x-matroska,video/webm,video/quicktime"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            style={inputStyle}
          />

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              name="isPublished"
              checked={form.isPublished}
              onChange={handleChange}
            />
            Published
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#e50914",
              color: "#fff",
              border: "none",
              padding: "12px 18px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Đang tạo..." : "Tạo Movie"}
          </button>
        </form>
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
};