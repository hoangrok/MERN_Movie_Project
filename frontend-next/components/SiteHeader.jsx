"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AuthButtons from "@/components/AuthButtons";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://dam18-api.onrender.com/api";

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery =
    searchParams.get("q") || searchParams.get("keyword") || "";

  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const wrapRef = useRef(null);

  const isActive = (path) =>
    pathname === path || (path !== "/" && pathname?.startsWith(path));

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!wrapRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const keyword = query.trim();

    if (!keyword) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${API_BASE}/movies?q=${encodeURIComponent(keyword)}&limit=8`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setResults([]);
          setOpen(true);
          return;
        }

        const items =
          data?.items ||
          data?.movies ||
          data?.results ||
          data?.data ||
          (Array.isArray(data) ? data : []);

        setResults(Array.isArray(items) ? items.slice(0, 8) : []);
        setOpen(true);
      } catch (error) {
        if (error?.name !== "AbortError") {
          setResults([]);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 260);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const hasDropdown = useMemo(() => {
    return open && query.trim().length > 0;
  }, [open, query]);

  const getMovieHref = (item) => {
    if (item?.slug) return `/adult/${item.slug}`;
    return "/adult";
  };

  const getMovieImage = (item) =>
    item?.displayImage ||
    item?.displayBackdrop ||
    item?.poster ||
    item?.backdrop ||
    "https://dummyimage.com/160x90/111827/ffffff&text=Video";

  const getMovieMeta = (item) => {
    const bits = [];
    if (item?.year) bits.push(item.year);

    if (item?.displayDuration) bits.push(item.displayDuration);
    else if (typeof item?.duration === "number" && item.duration > 0) {
      const total = Math.floor(item.duration);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      if (h > 0) bits.push(`${h} giờ ${m} phút`);
      else if (m > 0) bits.push(`${m} phút`);
    }

    if (typeof item?.views === "number") {
      bits.push(`${item.views.toLocaleString("vi-VN")} lượt xem`);
    } else if (item?.displayViews) {
      bits.push(item.displayViews);
    }

    if (item?.language) bits.push(item.language);

    return bits.join(" • ");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const keyword = query.trim();
    if (!keyword) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <header className="siteHeader">
      <div className="container">
        <div className="siteHeader__inner">
          <Link href="/" className="siteHeader__brand" aria-label="ClipDam18">
            <span className="siteHeader__brandMark">Clip</span>
            <span className="siteHeader__brandText">Dam18</span>
          </Link>

          <nav className="siteHeader__nav">
            <Link
              href="/latest"
              className={`siteHeader__pill ${isActive("/latest") ? "isActive" : ""}`}
            >
              Mới cập nhật
            </Link>

            <Link
              href="/trending"
              className={`siteHeader__pill ${isActive("/trending") ? "isActive" : ""}`}
            >
              Top lượt xem
            </Link>

            <Link
              href="/genres"
              className={`siteHeader__pill ${isActive("/genres") ? "isActive" : ""}`}
            >
              Thể loại
            </Link>
          </nav>

          <div className="siteHeader__searchWrap" ref={wrapRef}>
            <form onSubmit={handleSubmit} className="siteHeader__search">
              <span className="siteHeader__searchIcon">🔎</span>

              <input
                type="text"
                name="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (query.trim()) setOpen(true);
                }}
                placeholder="Tìm video..."
                className="siteHeader__input"
                autoComplete="off"
              />

              <button type="submit" className="siteHeader__button">
                Tìm
              </button>

              <Link href="/search/advanced" className="siteHeader__advancedButton">
                Nâng cao
              </Link>
            </form>

            {hasDropdown ? (
              <div className="siteHeader__dropdown">
                {loading ? (
                  <div className="siteHeader__dropdownState">Đang tìm video...</div>
                ) : results.length > 0 ? (
                  <>
                    {results.map((item) => (
                      <Link
                        key={item?._id || item?.slug || item?.title}
                        href={getMovieHref(item)}
                        className="siteHeader__result"
                        onClick={() => setOpen(false)}
                      >
                        <img
                          src={getMovieImage(item)}
                          alt={item?.title || "video"}
                          className="siteHeader__resultThumb"
                        />

                        <div className="siteHeader__resultBody">
                          <div className="siteHeader__resultTitle line-clamp-1">
                            {item?.title || "Video không có tiêu đề"}
                          </div>
                          <div className="siteHeader__resultMeta line-clamp-1">
                            {getMovieMeta(item) || "Nội dung liên quan"}
                          </div>
                        </div>
                      </Link>
                    ))}

                    <button
                      type="button"
                      className="siteHeader__viewAll"
                      onClick={() => {
                        setOpen(false);
                        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                      }}
                    >
                      Xem tất cả kết quả cho “{query.trim()}”
                    </button>
                  </>
                ) : (
                  <div className="siteHeader__dropdownState">
                    Không tìm thấy video phù hợp
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <AuthButtons />
        </div>
      </div>

      <style jsx>{`
        .siteHeader {
          position: sticky;
          top: 0;
          z-index: 50;
          padding-top: 8px;
          backdrop-filter: blur(18px);
          background: linear-gradient(
            180deg,
            rgba(4, 7, 14, 0.92),
            rgba(4, 7, 14, 0.78)
          );
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22);
        }

        .siteHeader__inner {
          min-height: 72px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.06),
            rgba(255, 255, 255, 0.025)
          );
          box-shadow:
            0 18px 48px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .siteHeader__brand {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0 4px 0 0;
          white-space: nowrap;
        }

        .siteHeader__brandMark {
          font-size: 1.45rem;
          font-weight: 900;
          letter-spacing: -0.05em;
          color: #ffffff;
          line-height: 1;
        }

        .siteHeader__brandText {
          font-size: 1.45rem;
          font-weight: 900;
          letter-spacing: -0.05em;
          line-height: 1;
          background: linear-gradient(135deg, #ff5c71 0%, #ffb36a 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .siteHeader__nav {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .siteHeader__nav::-webkit-scrollbar {
          display: none;
        }

        .siteHeader__pill {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.82);
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid transparent;
          background: transparent;
          transition: all 0.22s ease;
          flex-shrink: 0;
        }

        .siteHeader__pill:hover,
        .siteHeader__pill.isActive {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.1);
          color: #fff;
          transform: translateY(-1px);
        }

        .siteHeader__searchWrap {
          position: relative;
          margin-left: auto;
          width: min(520px, 100%);
          min-width: 0;
        }

        .siteHeader__search {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          min-width: 0;
          padding: 10px 12px;
          border-radius: 18px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.08),
            rgba(255, 255, 255, 0.045)
          );
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 16px 38px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        .siteHeader__searchIcon {
          opacity: 0.72;
          flex-shrink: 0;
        }

        .siteHeader__input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-size: 0.97rem;
        }

        .siteHeader__input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .siteHeader__button {
          min-height: 40px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #fff;
          color: #05070d;
          font-weight: 800;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .siteHeader__button:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(255, 255, 255, 0.12);
        }

        .siteHeader__advancedButton {
          min-height: 40px;
          padding: 0 15px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .siteHeader__advancedButton:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }

        .siteHeader__dropdown {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 10px);
          border-radius: 20px;
          overflow: hidden;
          background: linear-gradient(
            180deg,
            rgba(14, 18, 28, 0.98),
            rgba(10, 13, 21, 0.98)
          );
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(16px);
        }

        .siteHeader__dropdownState {
          padding: 18px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 0.95rem;
        }

        .siteHeader__result {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .siteHeader__result:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .siteHeader__resultThumb {
          width: 98px;
          height: 58px;
          object-fit: cover;
          border-radius: 12px;
          flex-shrink: 0;
          background: #111827;
        }

        .siteHeader__resultBody {
          min-width: 0;
          flex: 1;
        }

        .siteHeader__resultTitle {
          color: #fff;
          font-weight: 800;
          line-height: 1.3;
        }

        .siteHeader__resultMeta {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.62);
          font-size: 0.9rem;
        }

        .siteHeader__viewAll {
          width: 100%;
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          font-weight: 800;
          min-height: 48px;
        }

        .siteHeader__viewAll:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 1320px) {
          .siteHeader__inner {
            flex-wrap: wrap;
            padding-top: 12px;
            padding-bottom: 12px;
          }

          .siteHeader__searchWrap {
            order: 3;
            width: 100%;
            margin-left: 0;
          }
        }

        @media (max-width: 900px) {
          .siteHeader__brandMark,
          .siteHeader__brandText {
            font-size: 1.28rem;
          }

          .siteHeader__nav {
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .siteHeader__search {
            flex-wrap: wrap;
          }

          .siteHeader__button,
          .siteHeader__advancedButton {
            flex: 1;
          }

          .siteHeader__resultThumb {
            width: 84px;
            height: 50px;
          }
        }
      `}</style>
    </header>
  );
}