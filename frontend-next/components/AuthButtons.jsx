"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuthUser, logout } from "@/lib/auth";

export default function AuthButtons() {
  const [user, setUser] = useState(null);

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
          }

          .authBtn {
            min-height: 38px;
            padding: 0 14px;
            border-radius: 12px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            white-space: nowrap;
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

  return (
    <div className="authButtons">
      <Link href="/my-list" className="authBtn authBtn--ghost">
        My List {likedCount ? `(${likedCount})` : ""}
      </Link>

      <div className="authUser">
        {user?.name || user?.email}
      </div>

      <button
        type="button"
        className="authBtn authBtn--solid"
        onClick={logout}
      >
        Logout
      </button>

      <style jsx>{`
        .authButtons {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .authBtn {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          text-decoration: none;
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

        .authUser {
          color: rgba(255, 255, 255, 0.72);
          font-size: 0.92rem;
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}