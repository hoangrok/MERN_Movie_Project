import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
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

    if (form.password !== form.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp");
      return;
    }

    // tạm thời demo
    navigate("/login");
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Đăng ký</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Xác nhận mật khẩu"
            value={form.confirmPassword}
            onChange={handleChange}
            style={inputStyle}
          />

          <button type="submit" style={buttonStyle}>
            Tạo tài khoản
          </button>
        </form>

        <p style={textStyle}>
          Đã có tài khoản?{" "}
          <Link to="/login" style={linkStyle}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0b0b0f",
  padding: 24,
};

const cardStyle = {
  width: "100%",
  maxWidth: 420,
  background: "#14141c",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 28,
  color: "#fff",
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
};

const titleStyle = {
  margin: "0 0 20px",
  color: "#fff",
  fontSize: 32,
  fontWeight: 800,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#1c1c25",
  color: "#fff",
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#e50914",
  color: "#fff",
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