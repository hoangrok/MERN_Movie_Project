"use client";

import { useEffect, useMemo, useState } from "react";
import AdultCard from "@/components/AdultCard";
import { getAuthUser } from "@/lib/auth";
import { fetchLikedMovies, removeFromLiked } from "@/lib/user-api";
import Link from "next/link";

export default function MyListPage() {
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const total = useMemo(() => movies.length, [movies]);

  useEffect(() => {
    const syncUser = () => setUser(getAuthUser());

    syncUser();
    window.addEventListener("auth-updated", syncUser);
    window.addEventListener("liked-updated", syncUser);

    return () => {
      window.removeEventListener("auth-updated", syncUser);
      window.removeEventListener("liked-updated", syncUser);
    };
  }, []);

  useEffect(() => {
    const currentUser = getAuthUser();
    setUser(currentUser);

    if (!currentUser?.token) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setError("");
        const liked = await fetchLikedMovies();
        setMovies(liked);
      } catch (err) {
        setError(err.message || "Không tải được My List");
      } finally {
        setLoading(false);
      }
    }

    load();

    const reload = () => load();
    window.addEventListener("liked-updated", reload);

    return () => {
      window.removeEventListener("liked-updated", reload);
    };
  }, []);

  const handleRemove = async (movieId) => {
    try {
      await removeFromLiked(movieId);
      setMovies((prev) => prev.filter((item) => item._id !== movieId));
    } catch (err) {
      alert(err.message || "Không thể xoá khỏi My List");
    }
  };

  if (!user?.token) {
    return (
      <main className="pageWrap">
        <div className="container">
          <div className="surface box">
            <div className="eyebrow">MY LIST</div>
            <h1 className="heading-lg">Lưu lại video bạn muốn xem sau</h1>
            <p className="body-md" style={{ marginTop: 10 }}>
              Bạn cần đăng nhập để đồng bộ danh sách đã lưu trên thiết bị này.
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
            padding: 28px;
            border-radius: 28px;
          }

          .eyebrow {
            color: rgba(255,255,255,0.62);
            font-size: 0.82rem;
            font-weight: 800;
            letter-spacing: 0.12em;
          }

          .actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 18px;
          }

          .btnSolid,
          .btnGhost {
            min-height: 46px;
            padding: 0 18px;
            border-radius: 14px;
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
          <div>
            <div className="eyebrow">MY LIST</div>
            <h1 className="heading-lg" style={{ margin: 0, marginTop: 10 }}>
              Danh sách đã lưu
            </h1>
            <p className="body-md" style={{ marginTop: 10 }}>
              {total} video bạn muốn xem lại hoặc xem sau.
            </p>
          </div>

          <Link href="/latest" className="headBtn">
            Xem video mới
          </Link>
        </div>

        {loading ? (
          <div className="surface box">Đang tải...</div>
        ) : error ? (
          <div className="surface box">{error}</div>
        ) : movies.length ? (
          <div className="grid">
            {movies.map((movie, index) => (
              <div key={movie._id || movie.id} className="gridItem">
                <AdultCard movie={movie} priority={index < 6} />
                <button
                  type="button"
                  className="removeBtn"
                  onClick={() => handleRemove(movie._id)}
                >
                  Xoá khỏi My List
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface box">
            <h3 style={{ marginTop: 0 }}>Bạn chưa lưu video nào</h3>
            <p style={{ marginBottom: 0, color: "rgba(255,255,255,0.72)" }}>
              Khi thấy video hay, bấm “Lưu vào My List” để quay lại nhanh hơn.
            </p>
          </div>
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

        .eyebrow {
          color: rgba(255,255,255,0.62);
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .head {
          margin-bottom: 24px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .headBtn {
          min-height: 44px;
          padding: 0 16px;
          border-radius: 14px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #fff;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
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

        .gridItem {
          display: grid;
          gap: 10px;
        }

        .removeBtn {
          min-height: 42px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #fff;
          font-weight: 800;
        }
      `}</style>
    </main>
  );
}