"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import AuthButtons from "@/components/AuthButtons";

export default function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") || "";

  const isActive = (path) =>
    pathname === path || (path !== "/" && pathname?.startsWith(path));

  return (
    <header className="siteHeader">
      <div className="container siteHeader__inner">
        <Link href="/" className="siteHeader__brand">
          ClipDam18
        </Link>

        <nav className="siteHeader__nav">
          <Link
            href="/"
            className={`siteHeader__link ${
              isActive("/") && pathname === "/" ? "isActive" : ""
            }`}
          >
            Home
          </Link>

          <Link
            href="/adult"
            className={`siteHeader__link ${isActive("/adult") ? "isActive" : ""}`}
          >
            Adult
          </Link>

          <Link
            href="/search"
            className={`siteHeader__link ${isActive("/search") ? "isActive" : ""}`}
          >
            Search
          </Link>

          <Link
            href="/search/advanced"
            className={`siteHeader__link ${
              isActive("/search/advanced") ? "isActive" : ""
            }`}
          >
            Tìm kiếm nâng cao
          </Link>

          <Link
            href="/my-list"
            className={`siteHeader__link ${isActive("/my-list") ? "isActive" : ""}`}
          >
            My List
          </Link>
        </nav>

        <form action="/search" method="GET" className="siteHeader__search">
          <span className="siteHeader__searchIcon">🔍</span>

          <input
            type="text"
            name="q"
            defaultValue={currentQuery}
            placeholder="Tìm video..."
            className="siteHeader__input"
          />

          <button type="submit" className="siteHeader__button">
            Tìm
          </button>

          <Link href="/search/advanced" className="siteHeader__advancedButton">
            Nâng cao
          </Link>
        </form>

        <AuthButtons />
      </div>

      <style jsx>{`
        .siteHeader {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(16px);
          background: rgba(7, 9, 15, 0.72);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .siteHeader__inner {
          min-height: 72px;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .siteHeader__brand {
          flex-shrink: 0;
          text-decoration: none;
          color: #fff;
          font-weight: 900;
          letter-spacing: -0.03em;
          font-size: 1.2rem;
        }

        .siteHeader__nav {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .siteHeader__link {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          color: rgba(255, 255, 255, 0.78);
          text-decoration: none;
          font-weight: 700;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .siteHeader__link:hover,
        .siteHeader__link.isActive {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .siteHeader__search {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          width: min(560px, 100%);
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
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
          font-size: 0.96rem;
        }

        .siteHeader__input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .siteHeader__button {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #fff;
          color: #05070d;
          font-weight: 800;
          cursor: pointer;
          flex-shrink: 0;
        }

        .siteHeader__advancedButton {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          white-space: nowrap;
        }

        @media (max-width: 1240px) {
          .siteHeader__inner {
            flex-wrap: wrap;
            padding-top: 12px;
            padding-bottom: 12px;
          }

          .siteHeader__search {
            order: 3;
            width: 100%;
            margin-left: 0;
          }
        }

        @media (max-width: 640px) {
          .siteHeader__nav {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 2px;
          }

          .siteHeader__nav::-webkit-scrollbar {
            display: none;
          }

          .siteHeader__search {
            flex-wrap: wrap;
          }

          .siteHeader__button,
          .siteHeader__advancedButton {
            flex: 1;
          }
        }
      `}</style>
    </header>
  );
}