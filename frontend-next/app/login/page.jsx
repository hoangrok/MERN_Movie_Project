"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginUser } from "@/lib/user-api";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginUser(form);
      router.push("/adult");
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="authPage">
      <div className="container">
        <div className="authCard surface">
          <div className="kicker">Welcome back</div>
          <h1 className="heading-lg" style={{ marginTop: 16 }}>
            Đăng nhập
          </h1>
          <p className="body-md" style={{ marginTop: 10 }}>
            Đăng nhập để lưu My List và đồng bộ trải nghiệm xem.
          </p>

          <form onSubmit={onSubmit} className="authForm">
            <div>
              <label className="authLabel">Email</label>
              <input
                className="authInput"
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="Nhập email"
                required
              />
            </div>

            <div>
              <label className="authLabel">Mật khẩu</label>
              <input
                className="authInput"
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder="Nhập mật khẩu"
                required
              />
            </div>

            {error ? <div className="authError">{error}</div> : null}

            <button className="authSubmit" type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="authBottom">
            Chưa có tài khoản?{" "}
            <Link href="/register">Đăng ký</Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .authPage {
          min-height: 100vh;
          padding: 48px 0 70px;
          background:
            radial-gradient(circle at top, rgba(96, 94, 255, 0.12) 0%, rgba(255,255,255,0.03) 18%, rgba(0,0,0,0) 42%),
            linear-gradient(180deg, #07090f 0%, #090b12 45%, #040507 100%);
        }

        .authCard {
          max-width: 560px;
          margin: 0 auto;
          padding: 28px;
          border-radius: 24px;
        }

        .authForm {
          display: grid;
          gap: 16px;
          margin-top: 24px;
        }

        .authLabel {
          display: block;
          margin-bottom: 8px;
          color: #fff;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .authInput {
          width: 100%;
          min-height: 48px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          outline: none;
        }

        .authError {
          color: #ff9d9d;
          font-size: 0.92rem;
        }

        .authSubmit {
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.1);
          background: #fff;
          color: #05070d;
          font-weight: 800;
          cursor: pointer;
        }

        .authBottom {
          margin-top: 18px;
          color: rgba(255,255,255,0.72);
        }

        .authBottom :global(a) {
          color: #fff;
          text-decoration: none;
          font-weight: 700;
        }
      `}</style>
    </main>
  );
}