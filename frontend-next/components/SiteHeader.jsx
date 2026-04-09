"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import AuthButtons from "@/components/AuthButtons";

export default function SiteHeader() {
  const pathname = usePathname();

  const navItems = useMemo(
    () => [
      {
        href: "/latest",
        label: "Mới cập nhật",
        match: ["/latest", "/adult"],
      },
      {
        href: "/trending",
        label: "Top lượt xem",
        match: ["/trending"],
      },
      {
        href: "/genres",
        label: "Thể loại",
        match: ["/genres"],
      },
    ],
    []
  );

  const isActive = (item) =>
    item.match.some((path) => pathname === path || pathname?.startsWith(`${path}/`));

  return (
    <header className="siteHeader">
      <div className="container siteHeader__outer">
        <div className="siteHeader__shell">
          <div className="siteHeader__left">
            <Link href="/" className="siteHeader__brand" aria-label="ClipDam18">
              <span className="siteHeader__brandClip">Clip</span>
              <span className="siteHeader__brandDam">Dam18</span>
            </Link>

            <div className="siteHeader__divider" />

            <nav className="siteHeader__nav" aria-label="Điều hướng chính">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`siteHeader__pill ${isActive(item) ? "isActive" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="siteHeader__right">
            <AuthButtons />
          </div>
        </div>
      </div>

      <style jsx>{`
        .siteHeader {
          position: sticky;
          top: 0;
          z-index: 70;
          padding: 14px 0 0;
          background: linear-gradient(
            180deg,
            rgba(5, 7, 13, 0.92) 0%,
            rgba(5, 7, 13, 0.78) 72%,
            rgba(5, 7, 13, 0) 100%
          );
          backdrop-filter: blur(18px);
        }

        .siteHeader__outer {
          position: relative;
        }

        .siteHeader__shell {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 16px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.09) 0%,
              rgba(255, 255, 255, 0.035) 100%
            ),
            rgba(8, 11, 18, 0.88);
          box-shadow:
            0 22px 60px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(22px);
        }

        .siteHeader__left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 14px;
          flex: 1;
        }

        .siteHeader__brand {
          flex-shrink: 0;
          display: inline-flex;
          align-items: baseline;
          gap: 2px;
          text-decoration: none;
          white-space: nowrap;
          line-height: 1;
        }

        .siteHeader__brandClip {
          font-size: 1.7rem;
          font-weight: 900;
          letter-spacing: -0.06em;
          color: #ffffff;
        }

        .siteHeader__brandDam {
          font-size: 1.7rem;
          font-weight: 900;
          letter-spacing: -0.06em;
          background: linear-gradient(135deg, #ff5f6d 0%, #ffb86b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .siteHeader__divider {
          width: 1px;
          align-self: stretch;
          min-height: 46px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.02) 0%,
            rgba(255, 255, 255, 0.16) 50%,
            rgba(255, 255, 255, 0.02) 100%
          );
          flex-shrink: 0;
        }

        .siteHeader__nav {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 2px;
        }

        .siteHeader__nav::-webkit-scrollbar {
          display: none;
        }

        .siteHeader__pill {
          min-height: 44px;
          padding: 0 16px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.76);
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          transition:
            transform 0.22s ease,
            border-color 0.22s ease,
            background 0.22s ease,
            color 0.22s ease,
            box-shadow 0.22s ease;
        }

        .siteHeader__pill:hover {
          transform: translateY(-1px);
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.14);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.18);
        }

        .siteHeader__pill.isActive {
          color: #ffffff;
          background: linear-gradient(
            180deg,
            rgba(255, 114, 114, 0.2) 0%,
            rgba(255, 255, 255, 0.08) 100%
          );
          border-color: rgba(255, 132, 132, 0.3);
          box-shadow:
            0 14px 30px rgba(255, 82, 82, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .siteHeader__right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        @media (max-width: 1080px) {
          .siteHeader__shell {
            flex-wrap: wrap;
            padding: 14px;
          }

          .siteHeader__left {
            width: 100%;
            flex-wrap: wrap;
          }

          .siteHeader__divider {
            display: none;
          }

          .siteHeader__nav {
            width: 100%;
          }

          .siteHeader__right {
            width: 100%;
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .siteHeader {
            padding-top: 10px;
          }

          .siteHeader__shell {
            min-height: auto;
            border-radius: 20px;
          }

          .siteHeader__brandClip,
          .siteHeader__brandDam {
            font-size: 1.42rem;
          }

          .siteHeader__pill {
            min-height: 40px;
            padding: 0 14px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </header>
  );
}