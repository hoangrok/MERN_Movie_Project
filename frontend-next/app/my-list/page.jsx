"use client";

import { useEffect, useState } from "react";
import AdultCard from "@/components/AdultCard";
import { getAuthUser } from "@/lib/auth";
import { fetchLikedMovies } from "@/lib/user-api";
import Link from "next/link";

export default function MyListPage() {
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentUser = getAuthUser();
    setUser(currentUser);

    if (!currentUser?.token) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const liked = await fetchLikedMovies();
        setMovies(liked);
      } catch (err) {
        setError(err.message || "Không tải được My List");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (!user?.token) {
    return (
      <main className="pageWrap">
        <div className="container">
          <div className="surface box">
            <h1 className="heading-lg">My List</h1>
            <p className="body-md" style={{ marginTop: 10 }}>
              Bạn cần đăng nhập để xem danh sách đã lưu.
            </p>

            <div className="actions">
              <Link href="/login" className="btnSolid">
                Đăng nhập
              </Link>
              <Link href="/register" className="btnGhost">
                Đăng ký
              </Link>
            </div>
          </div>
        </div>

        <style jsx>{`
          .pageWrap {
            min-height: 100vh;
            padding: 48px 0 70px;
            background:
              radial-gradient(circle at top, rgba(96, 94, 255, 0.12) 0%, rgba(255,255,255,0.03) 18%, rgba(0,0,0,0) 42%),
              linear-gradient(180deg, #07090f 0%, #090b12 45%, #040507 100%);
          }

          .box {
            max-width: 720px;
            margin: 0 auto;
            padding: 24px;
            border-radius: 24px;
          }

          .actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 18px;
          }

          .btnSolid,
          .btnGhost {
            min-height: 44px;
            padding: 0 16px;
            border-radius: 12px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
          }

          .btnSolid {
            background: #fff;
            color: #05070d;
          }

          .btnGhost {
            background: rgba(255,255,255,0.06);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.1);
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="pageWrap">
      <div className="container">
        <div className="head">
          <h1 className="heading-lg" style={{ margin: 0 }}>
            My List
          </h1>
          <p className="body-md" style={{ marginTop: 10 }}>
            Danh sách nội dung bạn đã lưu.
          </p>
        </div>

        {loading ? (
          <div className="surface box">Đang tải...</div>
        ) : error ? (
          <div className="surface box">{error}</div>
        ) : movies.length ? (
          <div className="grid">
            {movies.map((movie, index) => (
              <AdultCard
                key={movie._id || movie.id}
                movie={movie}
                priority={index < 6}
              />
            ))}
          </div>
        ) : (
          <div className="surface box">Bạn chưa lưu video nào.</div>
        )}
      </div>

      <style jsx>{`
        .pageWrap {
          min-height: 100vh;
          padding: 48px 0 70px;
          background:
            radial-gradient(circle at top, rgba(96, 94, 255, 0.12) 0%, rgba(255,255,255,0.03) 18%, rgba(0,0,0,0) 42%),
            linear-gradient(180deg, #07090f 0%, #090b12 45%, #040507 100%);
        }

        .head {
          margin-bottom: 24px;
        }

        .box {
          padding: 24px;
          border-radius: 24px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
      `}</style>
    </main>
  );
}