import React, { useEffect, useMemo, useState } from "react";
import { API_URL } from "../../utils/api";
import "./AdSlot.scss";

function buildHtmlDocument(html = "") {
  return `<!doctype html>
<html>
  <head>
    <base target="_blank" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
        background: transparent;
        overflow: hidden;
        font-family: Arial, sans-serif;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img, iframe, video {
        max-width: 100%;
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;
}

function AdCreative({ ad }) {
  const htmlDoc = useMemo(() => buildHtmlDocument(ad.html), [ad.html]);

  const trackClick = () => {
    if (!ad?._id) return;

    fetch(`${API_URL}/ads/${ad._id}/click`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  };

  if (ad.format === "html") {
    return (
      <iframe
        className="adSlot__iframe"
        title={ad.title || "Advertisement"}
        srcDoc={htmlDoc}
        style={{ height: `${ad.height || 90}px` }}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  const image = (
    <img
      className="adSlot__image"
      src={ad.imageUrl}
      alt={ad.altText || ad.title || "Advertisement"}
      loading="lazy"
      decoding="async"
    />
  );

  if (!ad.targetUrl) {
    return image;
  }

  return (
    <a
      className="adSlot__link"
      href={ad.targetUrl}
      target={ad.openInNewTab ? "_blank" : "_self"}
      rel={ad.openInNewTab ? "noopener noreferrer sponsored" : "sponsored"}
      onClick={trackClick}
    >
      {image}
      {ad.ctaLabel ? <span className="adSlot__cta">{ad.ctaLabel}</span> : null}
    </a>
  );
}

export default function AdSlot({
  placement,
  limit = 1,
  variant = "banner",
  className = "",
}) {
  const [ads, setAds] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;

    const loadAds = async () => {
      if (!placement) return;

      try {
        const params = new URLSearchParams({
          placement,
          limit: String(limit),
        });

        const res = await fetch(`${API_URL}/ads?${params.toString()}`);
        const data = await res.json();

        if (active && data.success) {
          const nextAds = data.items || [];
          const firstId = nextAds[0]?._id || "";

          setAds(nextAds);
          setDismissed(
            firstId
              ? sessionStorage.getItem(`ad-dismissed-${firstId}`) === "1"
              : false
          );
        }
      } catch (err) {
        if (active) setAds([]);
      }
    };

    loadAds();

    return () => {
      active = false;
    };
  }, [placement, limit]);

  if (!ads.length || dismissed) return null;

  const firstAdId = ads[0]?._id || "";

  return (
    <aside
      className={`adSlot adSlot--${variant} ${className}`.trim()}
      data-placement={placement}
    >
      {variant === "floating" ? (
        <button
          type="button"
          className="adSlot__close"
          onClick={() => {
            if (firstAdId) {
              sessionStorage.setItem(`ad-dismissed-${firstAdId}`, "1");
            }
            setDismissed(true);
          }}
          aria-label="Close ad"
        >
          x
        </button>
      ) : null}

      <span className="adSlot__label">Ad</span>

      {ads.map((ad) => (
        <div
          key={ad._id}
          className="adSlot__item"
          style={{ width: ad.width || "100%" }}
        >
          <AdCreative ad={ad} />
        </div>
      ))}
    </aside>
  );
}
