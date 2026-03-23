// src/components/TrailerModal/TrailerModal.jsx
import React, { useEffect, useState } from "react";
import "./TrailerModal.scss";
import { IoPlayCircleSharp } from "react-icons/io5";
import { AiOutlinePlus, AiOutlineCheck, AiOutlineClose } from "react-icons/ai";
import { RiThumbUpFill, RiThumbDownFill } from "react-icons/ri";
import auth from "../../utils/firebase-config";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { removeLikedMovie } from "../../store/Slice/movie-slice";

const FALLBACK_POSTER =
  "https://dummyimage.com/1200x675/111/ffffff&text=No+Poster";

export default function TrailerModal({ movie, handleModal, isLiked }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setEmail(currentUser.email);
      } else {
        setEmail(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const addToMovieLikedList = async () => {
    if (!email) {
      toast("Vui lòng đăng nhập để thêm vào danh sách", {
        icon: "⚠️",
        style: { background: "#333", color: "#fff" },
      });
      navigate("/login");
      return;
    }

    try {
      await axios.post("/api/users/add", { email, movie });
      toast("Đã thêm vào danh sách", {
        icon: "👌",
        style: { background: "#333", color: "#fff" },
      });
    } catch (err) {
      toast("Lỗi khi thêm phim", {
        icon: "❌",
        style: { background: "#333", color: "#fff" },
      });
      console.error(err);
    }
  };

  const removeFromMovieLikedList = () => {
    if (!email) {
      toast("Vui lòng đăng nhập", {
        icon: "⚠️",
        style: { background: "#333", color: "#fff" },
      });
      navigate("/login");
      return;
    }

    dispatch(removeLikedMovie({ email, movie }));
    toast("Đã xóa khỏi danh sách", {
      icon: "👌",
      style: { background: "#333", color: "#fff" },
    });
  };

  const playMovie = () => {
    navigate(`/movie/${movie?._id}`);
  };

  const genres =
    movie?.genres && movie.genres.length > 0
      ? movie.genres.join(", ")
      : movie?.genre && movie.genre.length > 0
      ? movie.genre.join(", ")
      : "N/A";

  const posterImage = movie?.backdrop || movie?.poster || FALLBACK_POSTER;

  return (
    <div className="tm-overlay">
      <div className="tm-backdrop" onClick={() => handleModal(false)}></div>

      <div className="tm-modal">
        <button className="tm-close" onClick={() => handleModal(false)}>
          <AiOutlineClose />
        </button>

        <div className="tm-poster">
          <img
            src={posterImage}
            alt={movie?.title || movie?.name || "movie-poster"}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_POSTER;
            }}
          />
          <div className="tm-poster-gradient" />
          <div className="tm-poster-content">
            <h2 className="tm-title">{movie?.title || movie?.name}</h2>

            <div className="tm-meta">
              {movie?.year && <span>{movie.year}</span>}
              {(movie?.vote_average || movie?.rating) && (
                <span>⭐ {movie.vote_average || movie.rating}</span>
              )}
              {movie?.duration && <span>{movie.duration} phút</span>}
              {movie?.views && <span>{movie.views} lượt xem</span>}
            </div>

            <div className="tm-actions">
              <button className="tm-btn tm-btn--play" onClick={playMovie}>
                <IoPlayCircleSharp />
                <span>Xem ngay</span>
              </button>

              <button className="tm-icon-btn" title="Like">
                <RiThumbUpFill />
              </button>

              <button className="tm-icon-btn" title="Dislike">
                <RiThumbDownFill />
              </button>

              {isLiked ? (
                <button
                  className="tm-icon-btn"
                  title="Remove from List"
                  onClick={removeFromMovieLikedList}
                >
                  <AiOutlineCheck />
                </button>
              ) : (
                <button
                  className="tm-icon-btn"
                  title="Add to my list"
                  onClick={addToMovieLikedList}
                >
                  <AiOutlinePlus />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="tm-body">
          <div className="tm-main">
            <p className="tm-description">
              {movie?.description || movie?.overview || "Chưa có mô tả cho phim này."}
            </p>
          </div>

          <div className="tm-side">
            <div className="tm-info-item">
              <span className="label">Ngày phát hành:</span>
              <span className="value">
                {movie?.release_date || movie?.year || "N/A"}
              </span>
            </div>

            <div className="tm-info-item">
              <span className="label">Đánh giá:</span>
              <span className="value">
                {movie?.vote_average || movie?.rating || "N/A"}
              </span>
            </div>

            <div className="tm-info-item">
              <span className="label">Thể loại:</span>
              <span className="value">{genres}</span>
            </div>

            <div className="tm-info-item">
              <span className="label">Ngôn ngữ:</span>
              <span className="value">{movie?.original_language || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}