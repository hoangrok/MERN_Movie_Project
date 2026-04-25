import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar/Navbar";
import { API_BASE } from "../utils/api";
import "../assets/styles/AdminFeedback.scss";

const TYPE_LABEL = { request: "🎬 Yêu cầu phim", error: "⚠️ Báo lỗi" };
const STATUS_LABEL = { pending: "Chờ xử lý", seen: "Đã xem", resolved: "Đã xử lý" };
const STATUS_CLASS = { pending: "badge--pending", seen: "badge--seen", resolved: "badge--resolved" };

export default function AdminFeedback() {
  const { user, token } = useSelector((s) => s.auth);
  const authToken = token || user?.token || user?.accessToken || "";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const LIMIT = 20;

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`${API_BASE}/feedback?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, filterStatus, page]);

  const handleStatus = async (id, status) => {
    try {
      await fetch(`${API_BASE}/feedback/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      });
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status } : item))
      );
    } catch {
      alert("Cập nhật thất bại");
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="adminFeedback">
      <Navbar isScrolled />

      <main className="adminFeedback__main">
        <div className="adminFeedback__head">
          <h1>Feedback từ người dùng</h1>
          <span className="adminFeedback__total">{total} tin nhắn</span>
        </div>

        <div className="adminFeedback__filters">
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả loại</option>
            <option value="request">🎬 Yêu cầu phim</option>
            <option value="error">⚠️ Báo lỗi</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="seen">Đã xem</option>
            <option value="resolved">Đã xử lý</option>
          </select>
        </div>

        {loading ? (
          <div className="adminFeedback__empty">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="adminFeedback__empty">Không có tin nhắn nào.</div>
        ) : (
          <div className="adminFeedback__list">
            {items.map((item) => (
              <div key={item._id} className="fbCard">
                <div className="fbCard__top">
                  <span className="fbCard__type">{TYPE_LABEL[item.type] || item.type}</span>
                  <span className={`fbCard__badge ${STATUS_CLASS[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                  <span className="fbCard__time">
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>

                <p className="fbCard__message">{item.message}</p>

                <div className="fbCard__footer">
                  <span className="fbCard__user">
                    👤 {item.userName || "Ẩn danh"}
                  </span>

                  <div className="fbCard__actions">
                    {item.status !== "seen" && (
                      <button
                        type="button"
                        onClick={() => handleStatus(item._id, "seen")}
                      >
                        Đánh dấu đã xem
                      </button>
                    )}
                    {item.status !== "resolved" && (
                      <button
                        type="button"
                        className="btn--resolve"
                        onClick={() => handleStatus(item._id, "resolved")}
                      >
                        Đã xử lý
                      </button>
                    )}
                    {item.status === "resolved" && (
                      <button
                        type="button"
                        className="btn--reopen"
                        onClick={() => handleStatus(item._id, "pending")}
                      >
                        Mở lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="adminFeedback__pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Trước
            </button>
            <span>{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
