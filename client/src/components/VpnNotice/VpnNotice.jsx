import { useState, useEffect } from "react";

const STORAGE_KEY = "vpn_notice_dismissed";

export default function VpnNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={styles.wrap}>
      <span style={styles.icon}>⚡</span>
      <span style={styles.text}>
        Web load chậm? Hãy thử{" "}
        <strong style={styles.strong}>tắt VPN</strong> để có tốc độ tốt nhất.
      </span>
      <button onClick={dismiss} style={styles.close} aria-label="Đóng">
        ✕
      </button>
    </div>
  );
}

const styles = {
  wrap: {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(20,20,20,0.92)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(12px)",
    borderRadius: "12px",
    padding: "12px 18px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    maxWidth: "calc(100vw - 32px)",
    animation: "vpnSlideUp 0.35s ease",
  },
  icon: {
    fontSize: "18px",
    flexShrink: 0,
  },
  text: {
    color: "rgba(255,255,255,0.85)",
    fontSize: "14px",
    lineHeight: 1.4,
    whiteSpace: "nowrap",
  },
  strong: {
    color: "#fff",
  },
  close: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.45)",
    cursor: "pointer",
    fontSize: "14px",
    padding: "0 0 0 8px",
    flexShrink: 0,
    lineHeight: 1,
  },
};
