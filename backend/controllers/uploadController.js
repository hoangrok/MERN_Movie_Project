// 👉 COPY FULL FILE NÀY

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";

const API_URL = import.meta.env.VITE_API_URL;

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [movie, setMovie] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [editForm, setEditForm] = useState({});
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const path = require("path");
  const fs = require("fs");
  const generateThumbnails = require("../utils/generateThumbnails");
  const uploadFileToR2 = require("../utils/uploadFileToR2");
  const Movie = require("../models/MovieModel");

  // ================= LOAD MOVIE =================
  useEffect(() => {
    fetchMovie();
  }, [id]);

  const fetchMovie = async () => {
    const { data } = await axios.get(`${API_URL}/movies/${id}`);
    setMovie(data.movie);
    setEditForm({
      ...data.movie,
      genre: data.movie.genre?.join(", "),
    });
  };

  // ================= HANDLE INPUT =================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // ================= UPLOAD IMAGE =================
  const handleUploadImage = async (file, field) => {
    if (!file) return;

    try {
      if (field === "poster") setUploadingPoster(true);
      if (field === "backdrop") setUploadingBackdrop(true);

      const formData = new FormData();
      formData.append("image", file);

      const { data } = await axios.post(
        `${API_URL}/upload/image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      setEditForm((prev) => ({
        ...prev,
        [field]: data.url,
      }));
    } catch (err) {
      alert("Upload lỗi");
    } finally {
      setUploadingPoster(false);
      setUploadingBackdrop(false);
    }
  };

  // ================= UPDATE =================
  const handleUpdate = async (e) => {
    e.preventDefault();

    await axios.put(
      `${API_URL}/movies/${movie._id}`,
      {
        ...editForm,
        genre: editForm.genre.split(",").map((g) => g.trim()),
      },
      {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      }
    );

    alert("Updated!");
    setShowModal(false);
    fetchMovie();
  };

  // ================= DELETE =================
  const handleDelete = async () => {
    if (!confirm("Xóa phim?")) return;

    await axios.delete(`${API_URL}/movies/${movie._id}`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    });

    alert("Deleted!");
    navigate("/");
  };

  if (!movie) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20, color: "#fff" }}>
      <h1>{movie.title}</h1>

      <img src={movie.poster} width={200} />

      <p>{movie.description}</p>

      {/* ADMIN */}
      {user?.isAdmin && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setShowModal(true)}>✏️ Edit</button>
          <button onClick={handleDelete} style={{ marginLeft: 10 }}>
            ❌ Delete
          </button>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={overlay}>
          <form style={modal} onSubmit={handleUpdate}>
            <h2>Edit Movie</h2>

            <input
              name="title"
              value={editForm.title}
              onChange={handleChange}
              placeholder="Title"
            />

            <textarea
              name="description"
              value={editForm.description}
              onChange={handleChange}
              placeholder="Description"
            />

            <input
              name="genre"
              value={editForm.genre}
              onChange={handleChange}
              placeholder="Action, Drama"
            />

            {/* POSTER */}
            <input
              name="poster"
              value={editForm.poster}
              onChange={handleChange}
              placeholder="Poster URL"
            />

            <label style={uploadBtn}>
              {uploadingPoster ? "Uploading..." : "Upload Poster"}
              <input
                type="file"
                hidden
                onChange={(e) =>
                  handleUploadImage(e.target.files[0], "poster")
                }
              />
            </label>

            {editForm.poster && <img src={editForm.poster} width={100} />}

            {/* BACKDROP */}
            <input
              name="backdrop"
              value={editForm.backdrop}
              onChange={handleChange}
              placeholder="Backdrop URL"
            />

            <label style={uploadBtn}>
              {uploadingBackdrop ? "Uploading..." : "Upload Backdrop"}
              <input
                type="file"
                hidden
                onChange={(e) =>
                  handleUploadImage(e.target.files[0], "backdrop")
                }
              />
            </label>

            {editForm.backdrop && <img src={editForm.backdrop} width={150} />}

            <button type="submit">Save</button>
            <button onClick={() => setShowModal(false)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}

// STYLE
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modal = {
  background: "#111",
  padding: 20,
  borderRadius: 10,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  width: 400,
};

const uploadBtn = {
  background: "#333",
  padding: 10,
  cursor: "pointer",
};