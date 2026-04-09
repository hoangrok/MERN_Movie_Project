"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthUser, logout } from "@/lib/auth";

export default function AuthButtons() {
  const router = useRouter();
  const wrapRef = useRef(null);

  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setUser(getAuthUser());

    sync();
    window.addEventListener("auth-updated", sync);
    window.addEventListener("liked-updated", sync);

    return () => {
      window.removeEventListener("auth-updated", sync);
      window.removeEventListener("liked-updated", sync);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!wrapRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setOpen(false);
    router.push("/");
  };

  if (!user) {
    return (
      <div className="authButtons">
        <Link href="/login" className="authBtn authBtn--ghost">
          Login
        </Link>
        <Link href="/register" className="authBtn authBtn--solid">
          Register
        </Link>

        <style jsx>{`
          .authButtons {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
          }

          .authBtn {
            min-height: 40px;
            padding: 0 15px;
            border-radius: 14px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            white-space: nowrap;
            transition:
              transform 0.2s ease,
              background 0.2s ease,
              border-color 0.2s ease;
          }

          .authBtn:hover {
            transform: translateY(-1px);
          }

          .authBtn--ghost {
            color: #fff;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .authBtn--solid {
            color: #05070d;
            background: #fff;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
        `}</style>
      </div>
    );
  }

  const likedCount = Array.isArray(user?.likedMovies) ? user.likedMovies.length : 0;
  const label = user?.name || user?.email || "User";
  const initial = String(label).trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="authButtons authButtons--logged" ref={wrapRef}>
      <button
        type="button"
        className="userToggle"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="userAvatar">{initial}</span>

        <span className="userMeta">
          <span className="userName">{label}</span>
          <span className="userSub">{likedCount} video đã lưu</span>
        </span>

        <span className={`userCaret ${open ? "isOpen" : ""}`}>⌄</span>
      </button>

      {open ? (
        <div className="userDropdown">
          <Link href="/my-list" className="dropdownItem" onClick={() => setOpen(false)}>
            <span>My List</span>
            <strong>{likedCount}</strong>
          </Link>

          <Link
            href="/continue-watching"
            className="dropdownItem"
            onClick={() => setOpen(false)}
          >
            <span>Tiếp tục xem</span>
            <strong>→</strong>
          </Link>

          <Link href="/latest" className="dropdownItem" onClick={() => setOpen(false)}>
            <span>Mới cập nhật</span>
            <strong>→</strong>
          </Link>

          <button type="button" className="dropdownLogout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : null}

      <style jsx>{`
        .authButtons {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          position: relative;
        }

        .userToggle {
          min-height: 46px;
          padding: 6px 10px 6px 8px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #fff;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .userToggle:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.14);
        }

        .userAvatar {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ff6b81 0%, #ffb36a 100%);
          color: #05070d;
          font-weight: 900;
          flex-shrink: 0;
        }

        .userMeta {
          display: grid;
          min-width: 0;
        }

        .userName {
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
          font-weight: 800;
          font-size: 0.92rem;
        }

        .userSub {
          color: rgba(255, 255, 255, 0.62);
          font-size: 0.76rem;
          text-align: left;
        }

        .userCaret {
          opacity: 0.65;
          font-size: 0.9rem;
          transition: transform 0.2s ease;
        }

        .userCaret.isOpen {
          transform: rotate(180deg);
        }

        .userDropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 10px);
          min-width: 240px;
          padding: 10px;
          border-radius: 18px;
          background: linear-gradient(
            180deg,
            rgba(16, 20, 30, 0.98),
            rgba(11, 15, 24, 0.98)
          );
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(14px);
          z-index: 20;
        }

        .dropdownItem,
        .dropdownLogout {
          width: 100%;
          min-height: 44px;
          padding: 0 14px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #fff;
          text-decoration: none;
          background: transparent;
          border: 0;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .dropdownItem:hover,
        .dropdownLogout:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .dropdownLogout {
          margin-top: 6px;
          color: #ffb9b9;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
        }

        @media (max-width: 768px) {
          .userMeta {
            display: none;
          }

          .userToggle {
            padding-right: 8px;
          }

          .userDropdown {
            right: 0;
            min-width: 210px;
          }
        }
      `}</style>
    </div>
  );
}