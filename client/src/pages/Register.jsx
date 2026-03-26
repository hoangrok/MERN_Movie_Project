import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errorMsg) setErrorMsg("");
    if (successMsg) setSuccessMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");

    if (!form.name.trim()) {
      setErrorMsg("Vui lòng nhập tên");
      return;
    }

    if (!form.email.trim()) {
      setErrorMsg("Vui lòng nhập email");
      return;
    }

    if (!form.password) {
      setErrorMsg("Vui lòng nhập mật khẩu");
      return;
    }

    if (form.password.length < 6) {
      setErrorMsg("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);

      const res = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      if (res?.success) {
        setSuccessMsg(res.message || "Đăng ký thành công");

        setForm({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });

        setTimeout(() => {
          navigate("/login");
        }, 1000);
      } else {
        setErrorMsg(res?.message || "Đăng ký thất bại");
      }
    } catch (error) {
      console.log(error);
      setErrorMsg("Có lỗi xảy ra khi đăng ký");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Đăng ký</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          {errorMsg ? <div style={errorBoxStyle}>{errorMsg}</div> : null}
          {successMsg ? <div style={successBoxStyle}>{successMsg}</div> : null}

          <input
            type="text"
            name="name"
            placeholder="Tên hiển thị"
            value={form.name}
            onChange={handleChange}
            style={inputStyle}
          />

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

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
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
  opacity: 1,
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

const errorBoxStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(229, 9, 20, 0.14)",
  border: "1px solid rgba(229, 9, 20, 0.35)",
  color: "#ffb3b8",
  fontSize: 14,
};

const successBoxStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(16, 185, 129, 0.14)",
  border: "1px solid rgba(16, 185, 129, 0.35)",
  color: "#b7ffdf",
  fontSize: 14,
};