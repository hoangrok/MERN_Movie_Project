import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import axios from "axios";
import { API_URL } from "../../utils/api";
import "./CommentSection.scss";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function Avatar({ name }) {
  const letter = (name || "?")[0].toUpperCase();
  const colors = ["#e50914", "#0070f3", "#7c3aed", "#059669", "#d97706", "#db2777"];
  const idx = letter.charCodeAt(0) % colors.length;
  return (
    <span className="cmt-avatar" style={{ background: colors[idx] }}>{letter}</span>
  );
}

export default function CommentSection({ movieId }) {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const textRef = useRef(null);

  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!movieId) return;
    setComments([]);
    setPage(1);
    fetchComments(1, true);
  }, [movieId]);

  const fetchComments = async (p = 1, reset = false) => {
    try {
      const { data } = await axios.get(`${API_URL}/comments/${movieId}?page=${p}`);
      if (data.success) {
        setComments((prev) => reset ? data.comments : [...prev, ...data.comments]);
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
    } catch {}
  };

  const loadMore = async () => {
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    await fetchComments(next);
    setLoadingMore(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.token) { navigate("/login"); return; }
    if (!content.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API_URL}/comments`,
        { movieId, content: content.trim() },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (data.success) {
        setComments((prev) => [data.comment, ...prev]);
        setTotal((t) => t + 1);
        setContent("");
        textRef.current?.focus();
      } else {
        setError(data.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Có lỗi xảy ra");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa bình luận này?")) return;
    try {
      await axios.delete(`${API_URL}/comments/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setComments((prev) => prev.filter((c) => c._id !== id));
      setTotal((t) => t - 1);
    } catch {}
  };

  return (
    <section className="cmt-section">
      <h2 className="cmt-title">Bình luận {total > 0 ? `(${total})` : ""}</h2>

      <form className="cmt-form" onSubmit={handleSubmit}>
        {user ? (
          <Avatar name={user.name} />
        ) : (
          <span className="cmt-avatar cmt-avatar--guest">?</span>
        )}
        <div className="cmt-form__right">
          <textarea
            ref={textRef}
            className="cmt-input"
            placeholder={user ? "Viết bình luận..." : "Đăng nhập để bình luận"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={2}
            onFocus={() => { if (!user) navigate("/login"); }}
          />
          {error && <p className="cmt-error">{error}</p>}
          <div className="cmt-form__actions">
            <span className="cmt-char">{content.length}/500</span>
            <button
              type="submit"
              className="cmt-submit"
              disabled={submitting || !content.trim()}
            >
              {submitting ? "Đang gửi..." : "Gửi"}
            </button>
          </div>
        </div>
      </form>

      <div className="cmt-list">
        {comments.length === 0 && (
          <p className="cmt-empty">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        )}
        {comments.map((c) => (
          <div key={c._id} className="cmt-item">
            <Avatar name={c.userName} />
            <div className="cmt-item__body">
              <div className="cmt-item__header">
                <strong>{c.userName}</strong>
                <span>{timeAgo(c.createdAt)}</span>
                {(user?._id === c.userId || user?.isAdmin) && (
                  <button
                    type="button"
                    className="cmt-delete"
                    onClick={() => handleDelete(c._id)}
                    aria-label="Xóa bình luận"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
              <p className="cmt-content">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          className="cmt-more"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Đang tải..." : "Xem thêm bình luận"}
        </button>
      )}
    </section>
  );
}
