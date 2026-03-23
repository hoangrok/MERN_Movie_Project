import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Tạm thời demo UI
    console.log("Login:", form);
    navigate("/");
  };

  return (
    <div style={pageStyle}>
      <div style={overlayStyle} />
      <div style={boxStyle}>
        <h1 style={titleStyle}>Đăng nhập</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            style={inputStyle}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={handleChange}
            style={inputStyle}
            required
          />

          <button type="submit" style={buttonStyle}>
            Đăng nhập
          </button>
        </form>

        <p style={textStyle}>
          Chưa có tài khoản?{" "}
          <Link to="/register" style={linkStyle}>
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background:
    'linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.78)), url("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80") center/cover no-repeat',
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
};

const overlayStyle = {
  position: "absolute",
  inset: 0,
};

const boxStyle = {
  position: "relative",
  zIndex: 2,
  width: "100%",
  maxWidth: 420,
  background: "rgba(15,15,18,0.88)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 32,
  backdropFilter: "blur(14px)",
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
};

const titleStyle = {
  color: "#fff",
  marginBottom: 22,
  fontSize: 32,
  fontWeight: 800,
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  outline: "none",
};

const buttonStyle = {
  background: "#e50914",
  color: "#fff",
  border: "none",
  padding: "14px 16px",
  borderRadius: 10,
  fontWeight: 700,
  cursor: "pointer",
};

const textStyle = {
  marginTop: 18,
  color: "rgba(255,255,255,0.72)",
};

const linkStyle = {
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
};