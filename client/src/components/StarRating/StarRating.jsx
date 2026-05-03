import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import { API_URL } from "../../utils/api";
import axios from "axios";
import "./StarRating.scss";

export default function StarRating({ movieId }) {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [hovered, setHovered] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!movieId) return;

    axios.get(`${API_URL}/ratings/movie/${movieId}`).then(({ data }) => {
      if (data.success) {
        setAvgRating(data.avgRating);
        setCount(data.count);
      }
    }).catch(() => {});

    if (user?.token) {
      axios.get(`${API_URL}/ratings/my/${movieId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      }).then(({ data }) => {
        if (data.success) setMyScore(data.score);
      }).catch(() => {});
    }
  }, [movieId, user]);

  const handleRate = async (score) => {
    if (!user?.token) {
      navigate("/login");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/ratings`,
        { movieId, score },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (data.success) {
        setMyScore(score);
        setAvgRating(data.avgRating);
        setCount(data.count);
      }
    } catch {}
    setSaving(false);
  };

  const display = hovered || myScore;

  return (
    <div className="star-rating">
      <div className="star-rating__stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`star-rating__star${display >= n ? " star-rating__star--on" : ""}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleRate(n)}
            aria-label={`${n} sao`}
            disabled={saving}
          >
            <FaStar />
          </button>
        ))}
      </div>

      <div className="star-rating__info">
        {myScore > 0 && <span className="star-rating__my">Bạn đã chấm: {myScore}★</span>}
        {count > 0 && (
          <span className="star-rating__avg">
            {avgRating}★ <span className="star-rating__count">({count} đánh giá)</span>
          </span>
        )}
        {!user && (
          <span className="star-rating__hint">
            <button type="button" onClick={() => navigate("/login")}>Đăng nhập</button> để đánh giá
          </span>
        )}
      </div>
    </div>
  );
}
