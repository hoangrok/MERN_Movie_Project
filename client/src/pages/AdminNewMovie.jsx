import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

export default function AdminNewMovie() {
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);

  const authToken = token || user?.token;

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

  const uploadImage = async (file) => {
    if (!file) return "";

    const fd = new FormData();
    fd.append("image", file);

    const res = await fetch(`${API_BASE}/api/upload/image`, {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      body: fd,
    });

    const data = await parseJsonSafe(res);

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Upload ảnh thất bại");
    }

    return data.url;
  };

  const uploadVideo = async (movieId, file) => {
    if (!file) return;

    const fd = new FormData();
    fd.append("video", file);

    const res = await fetch(`${API_BASE}/api/upload/video/${movieId}`, {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      body: fd,
    });

    const data = await parseJsonSafe(res);

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Upload video thất bại");
    }

    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
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
        duration: form.duration || "",
        isPublished: form.isPublished,
      };

      setMessage("Đang tạo movie...");

      const createRes = await fetch(`${API_BASE}/api/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
        setMessage("Đang upload video và convert HLS...");
        await uploadVideo(movieId, videoFile);
      }

      setMessage("Tạo movie thành công");

      setTimeout(() => {
        navigate(`/movie/${movieId}`);
      }, 500);
    } catch (err) {
      console.error(err);
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
          maxWidth: 700,
          margin: "0 auto",
          background: "#181818",
          padding: 24,
          borderRadius: 12,
        }}
      >
        <h1 style={{ marginBottom: 20 }}>Admin - Tạo Movie</h1>

        {message && (
          <p style={{ marginBottom: 16, color: "#f5c542" }}>{message}</p>
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
            accept="video/mp4,video/mkv,video/webm,video/quicktime"
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