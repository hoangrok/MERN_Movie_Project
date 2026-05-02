import { useState, useEffect, useRef } from "react";
import "./TelegramWidget.scss";

const TG_URL = "https://t.me/tradamamtom1";
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=png&color=2563eb&bgcolor=ffffff&data=${encodeURIComponent(TG_URL)}`;

export default function TelegramWidget() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="tgw" ref={ref}>
      {open && (
        <div className="tgw__card">
          <button className="tgw__close" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>

          <div className="tgw__top">
            <div className="tgw__icon-wrap">
              <svg viewBox="0 0 240 240" fill="none" className="tgw__tg-logo">
                <circle cx="120" cy="120" r="120" fill="url(#tg-grad)" />
                <defs>
                  <linearGradient id="tg-grad" x1="120" y1="0" x2="120" y2="240" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2AABEE" />
                    <stop offset="1" stopColor="#229ED9" />
                  </linearGradient>
                </defs>
                <path d="M81.2 130.4l-4.8 33.7c0 0 -.7 5.2 4.6 5.2s6.9-6.5 6.9-6.5l16.5-15.7" fill="#C8DAEA" />
                <path d="M81.2 130.4L166.5 68s5.2-3.2 5 1.8c0 0 .9 .6-1.8 3.2-2.8 2.6-70.4 63.3-70.4 63.3" fill="#A9C9DD" />
                <path d="M100.3 147.3l44.8 33.1s5.4 3.3 7.3-1.8l24.5-96.6s3.4-10.3-7.3-5.7L57.2 116.7s-10.9 4.4-7.4 9.3c3.5 4.9 10.6 7 10.6 7l26.9 8.4z" fill="white" />
                <path d="M100.3 147.3l-2.8 29.7s-.4 2.8 1.4 3.4c1.8 .5 2.8-.9 2.8-.9l16.7-15" fill="#C8DAEA" />
              </svg>
            </div>
            <div className="tgw__heading">
              <p className="tgw__eyebrow">Kênh chính thức</p>
              <h3 className="tgw__title">@TRADAMAMTOM1</h3>
            </div>
          </div>

          <p className="tgw__msg">
            Tham gia ngay để không bao giờ <strong>lạc mất nhau</strong> — clip mới, link dự phòng, thông báo bảo trì đều ở đây.
          </p>

          <div className="tgw__qr-wrap">
            <img
              src={QR_URL}
              alt="QR Telegram"
              className="tgw__qr"
              loading="lazy"
              width={180}
              height={180}
            />
            <p className="tgw__qr-hint">Quét để vào nhóm</p>
          </div>

          <a
            href={TG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tgw__btn"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
            </svg>
            Tham gia Telegram
          </a>
        </div>
      )}

      <button
        className={`tgw__fab ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Telegram"
        title="Tham gia Telegram"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
        </svg>
        <span className="tgw__fab-label">Telegram</span>
      </button>
    </div>
  );
}
