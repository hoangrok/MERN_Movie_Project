import { useState, useEffect, useCallback } from "react";
import "./SiteSupport.scss";

const SESSION_KEY = "sp_ok";

// Bait element: catches extension-based blockers (uBlock Origin, AdBlock Plus, AdGuard...)
// These inject CSS to hide elements with ad-related class names
function checkBlocker() {
  return new Promise((resolve) => {
    const bait = document.createElement("div");
    bait.className = "ads ad adsbox doubleclick ad-placement carbon-ads textad";
    bait.style.cssText =
      "height:1px;width:1px;position:absolute;left:-9999px;top:-9999px;pointer-events:none;";
    document.body.appendChild(bait);

    setTimeout(() => {
      let blocked = false;
      try {
        if (!document.body.contains(bait)) {
          blocked = true;
        } else {
          const s = window.getComputedStyle(bait);
          blocked =
            bait.offsetHeight === 0 ||
            bait.offsetWidth === 0 ||
            bait.offsetParent === null ||
            s.display === "none" ||
            s.visibility === "hidden" ||
            parseFloat(s.opacity) < 0.1;
        }
      } catch {
        blocked = true;
      }
      if (document.body.contains(bait)) {
        try { document.body.removeChild(bait); } catch {}
      }
      resolve(blocked);
    }, 300);
  });
}

export default function SiteSupport() {
  const [blocked, setBlocked] = useState(false);
  const [rechecking, setRechecking] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const t = setTimeout(async () => {
      const result = await checkBlocker();
      setBlocked(result);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  const recheck = useCallback(async () => {
    setRechecking(true);
    const result = await checkBlocker();
    setRechecking(false);
    if (!result) {
      sessionStorage.setItem(SESSION_KEY, "1");
    }
    setBlocked(result);
  }, []);

  if (!blocked) return null;

  return (
    <div className="ssp__overlay" role="dialog" aria-modal="true">
      <div className="ssp__card">
        <div className="ssp__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="ssp__title">Bạn đang dùng trình chặn quảng cáo</h2>
        <p className="ssp__desc">
          Web này hoàn toàn <strong>miễn phí</strong> nhờ vào quảng cáo.
          Vui lòng tắt trình chặn quảng cáo (AdBlock, uBlock…) cho trang này
          để tiếp tục xem phim.
        </p>

        <ol className="ssp__steps">
          <li>Nhấn biểu tượng extension adblock trên thanh trình duyệt</li>
          <li>Chọn <strong>"Tắt trên trang này"</strong> hoặc <strong>"Pause on this site"</strong></li>
          <li>Bấm nút bên dưới để kiểm tra lại</li>
        </ol>

        <button
          className="ssp__btn"
          onClick={recheck}
          disabled={rechecking}
        >
          {rechecking ? (
            <span className="ssp__spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {rechecking ? "Đang kiểm tra…" : "Tôi đã tắt rồi, kiểm tra lại"}
        </button>
      </div>
    </div>
  );
}
