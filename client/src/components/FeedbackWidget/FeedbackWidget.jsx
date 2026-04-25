import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { API_BASE } from "../../utils/api";
import "./FeedbackWidget.scss";

const TABS = [
  { key: "request", label: "🎬 Yêu cầu phim" },
  { key: "error", label: "⚠️ Báo lỗi" },
];

const PLACEHOLDER = {
  request: "Tên phim bạn muốn xem, diễn viên, năm...",
  error: "Mô tả lỗi bạn gặp phải (phim nào, lỗi gì)...",
};

export default function FeedbackWidget() {
  const { user, token } = useSelector((s) => s.auth);
  const authToken = token || user?.token || user?.accessToken || "";

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("request");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open, tab]);

  useEffect(() => {
    setMessage("");
    setSent(false);
    setError("");
  }, [tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 3) {
      setError("Vui lòng nhập nội dung (ít nhất 3 ký tự).");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ type: tab, message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Gửi thất bại");
      }

      setSent(true);
      setMessage("");
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra, thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fbWidget ${open ? "fbWidget--open" : ""}`}>
      {open && (
        <div className="fbWidget__panel">
          <div className="fbWidget__header">
            <span>Hỗ trợ</span>
            <button
              type="button"
              className="fbWidget__close"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>

          <div className="fbWidget__tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`fbWidget__tab ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form className="fbWidget__body" onSubmit={handleSubmit}>
            {sent ? (
              <div className="fbWidget__success">
                ✅ Đã gửi! Cảm ơn bạn.
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  className="fbWidget__textarea"
                  placeholder={PLACEHOLDER[tab]}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setError("");
                  }}
                  rows={4}
                  maxLength={1000}
                  disabled={loading}
                />
                {error && <p className="fbWidget__error">{error}</p>}
                <div className="fbWidget__footer">
                  <span className="fbWidget__count">{message.length}/1000</span>
                  <button
                    type="submit"
                    className="fbWidget__submit"
                    disabled={loading || !message.trim()}
                  >
                    {loading ? "Đang gửi..." : "Gửi"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      <button
        type="button"
        className="fbWidget__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở hỗ trợ"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
