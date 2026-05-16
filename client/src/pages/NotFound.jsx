import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 20px",
        color: "#fff",
      }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: "#e50914", lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "16px 0 8px" }}>
          Trang không tồn tại
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: 32, maxWidth: 400 }}>
          Đường dẫn bạn truy cập không tồn tại hoặc đã bị xóa.
        </p>
        <Link
          to="/"
          style={{
            background: "#e50914",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Về trang chủ
        </Link>
      </div>
    </>
  );
}
