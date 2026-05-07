import { useEffect, useRef, useState } from "react";
import { FaTelegram, FaTimes, FaBullhorn, FaCheckCircle } from "react-icons/fa";
import "./AdPopup.scss";

const PERKS = [
  "Tiếp cận hàng nghìn người xem mỗi ngày",
  "Hiển thị nổi bật trên trang chủ & trang phim",
  "Banner, popup, video — đủ định dạng",
  "Báo cáo lượt xem & click minh bạch",
];

export default function AdPopup() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (sessionStorage.getItem("adPopupSeen")) return;
    timerRef.current = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timerRef.current);
  }, []);

  const close = () => {
    sessionStorage.setItem("adPopupSeen", "1");
    setVisible(false);
  };

  // Always rendered — visibility toggled via CSS class to avoid scroll-jump on mount
  return (
    <div
      className={`adPopup__backdrop${visible ? " is-visible" : ""}`}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Quảng cáo"
      aria-hidden={!visible}
    >
      <div className="adPopup__card" onClick={(e) => e.stopPropagation()}>

        <button className="adPopup__close" onClick={close} aria-label="Đóng quảng cáo" tabIndex={visible ? 0 : -1}>
          <FaTimes />
        </button>

        <div className="adPopup__header">
          <span className="adPopup__badge">
            <FaBullhorn /> Hợp tác quảng cáo
          </span>
          <h2 className="adPopup__title">
            Đưa thương hiệu của bạn<br />đến đúng người xem.
          </h2>
          <p className="adPopup__sub">
            Quảng cáo trên <strong>clipdam18.com</strong> — nền tảng xem phim
            18+ lớn, lượng traffic ổn định mỗi ngày.
          </p>
        </div>

        <ul className="adPopup__perks">
          {PERKS.map((p) => (
            <li key={p}>
              <FaCheckCircle />
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <div className="adPopup__contact">
          <p>Liên hệ ngay để được tư vấn miễn phí:</p>
          <a
            className="adPopup__tg"
            href="https://t.me/kikomino"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={visible ? 0 : -1}
          >
            <FaTelegram />
            @kikomino
          </a>
        </div>

        <button className="adPopup__dismiss" onClick={close} tabIndex={visible ? 0 : -1}>
          Không, cảm ơn
        </button>
      </div>
    </div>
  );
}
