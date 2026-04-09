import ContinueWatching from "@/components/ContinueWatching";
import AdultCard from "@/components/AdultCard";
import { getAdultMovies } from "@/lib/api";

export const metadata = {
  title: "Clip 18+",
  description:
    "Xem clip 18+ mới nhất, danh sách video hot và nội dung được cập nhật liên tục tại ClipDam18.",
  robots: "index, follow",
  openGraph: {
    title: "Clip 18+ | ClipDam18",
    description:
      "Xem clip 18+ mới nhất, danh sách video hot và nội dung được cập nhật liên tục tại ClipDam18.",
    url: "https://clipdam18.com/adult",
    siteName: "ClipDam18",
    type: "website",
  },
};

const featuredVideo = {
  title: "Kho nội dung 18+ tuyển chọn cập nhật mỗi ngày",
  subtitle: "Tổng hợp những clip nổi bật, nội dung đang hot và video mới lên sóng mỗi ngày.",
  badge: "Khu vực riêng cho người xem 18+",
};

function SectionHeader({ title, desc }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 className="section-title">{title}</h2>
      {desc ? <p className="section-desc">{desc}</p> : null}
    </div>
  );
}

function CTAButton({ href, children, primary = false }) {
  return (
    <a
      href={href}
      className={primary ? "adultCta adultCta--primary" : "adultCta adultCta--ghost"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 52,
        padding: "0 22px",
        borderRadius: 16,
        fontWeight: 800,
        fontSize: "0.97rem",
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        textDecoration: "none",
        background: primary ? "#fff" : "rgba(255,255,255,0.06)",
        color: primary ? "#05070d" : "#ffffff",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: primary ? "0 12px 28px rgba(255,255,255,0.12)" : "none",
      }}
    >
      {children}
    </a>
  );
}

function HeroFeatureCard({ item }) {
  if (!item) return null;

  return (
    <a
      href={`/adult/${item.slug}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        borderRadius: 26,
        overflow: "hidden",
        position: "relative",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 8.4",
          background: "#0d1118",
          overflow: "hidden",
        }}
      >
        <img
          src={item.displayBackdrop || item.displayImage || item.poster || ""}
          alt={item.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: "scale(1.02)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(3,6,12,0.98) 0%, rgba(3,6,12,0.7) 34%, rgba(3,6,12,0.12) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            top: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 34,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255, 92, 92, 0.16)",
              border: "1px solid rgba(255, 92, 92, 0.24)",
              color: "#ffb1b1",
              fontSize: "0.78rem",
              fontWeight: 700,
              backdropFilter: "blur(10px)",
            }}
          >
            {item.newPopular ? "Đang nổi bật" : "Hot hôm nay"}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 34,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "#ffffff",
              fontSize: "0.78rem",
              fontWeight: 700,
              backdropFilter: "blur(10px)",
            }}
          >
            {item.displayViews || "Hot"}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: 20,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-manrope), var(--font-inter), Arial, sans-serif",
              fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
              lineHeight: 1.18,
              letterSpacing: "-0.03em",
              fontWeight: 900,
              color: "#ffffff",
            }}
          >
            {item.title}
          </h3>

          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              maxWidth: 760,
              fontSize: "0.96rem",
              lineHeight: 1.7,
              color: "rgba(255,255,255,0.76)",
            }}
          >
            {item.description || "Nội dung đang được xem nhiều và nổi bật nhất hiện tại."}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 14,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 34,
                padding: "0 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
                fontSize: "0.84rem",
                fontWeight: 800,
              }}
            >
              {item.displayDuration || "HD"}
            </span>

            {Array.isArray(item.genre) && item.genre.length ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 34,
                  padding: "0 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: "0.84rem",
                  fontWeight: 800,
                }}
              >
                {item.genre.slice(0, 2).join(" • ")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </a>
  );
}

function InfoStripItem({ value, label }) {
  return (
    <div
      className="surface"
      style={{
        padding: "16px 18px",
        borderRadius: 20,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-manrope), var(--font-inter), Arial, sans-serif",
          fontSize: "1rem",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#ffffff",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: "0.9rem",
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.64)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default async function AdultPage() {
  const movies = await getAdultMovies();

  const heroMovie = movies[0] || null;
  const hotMovies = movies.slice(1, 9);
  const latestMovies = movies.slice(9, 21);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(120, 89, 255, 0.14) 0%, rgba(255,255,255,0.03) 18%, rgba(0,0,0,0) 42%), linear-gradient(180deg, #07090f 0%, #090b12 45%, #040507 100%)",
      }}
    >
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,72,72,0.16) 0%, rgba(92,83,255,0.12) 52%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
          }}
        />

        <div
          className="container"
          style={{
            position: "relative",
            zIndex: 2,
            paddingTop: 110,
            paddingBottom: 70,
          }}
        >
          <div className="kicker" style={{ marginTop: 8 }}>
            {featuredVideo.badge}
          </div>

          <h1
            className="heading-xl"
            style={{
              maxWidth: 920,
              marginTop: 20,
              color: "#ffffff",
            }}
          >
            {featuredVideo.title}
          </h1>

          <p
            className="body-lg"
            style={{
              maxWidth: 900,
              marginTop: 18,
            }}
          >
            {featuredVideo.subtitle}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 30,
              justifyContent: "center",
            }}
          >
            <CTAButton href="/" primary>
              Về trang chủ
            </CTAButton>

            <CTAButton href="/latest">Mới cập nhật</CTAButton>
            <CTAButton href="/trending">Top lượt xem</CTAButton>
          </div>

          <div
            className="surface"
            style={{
              marginTop: 34,
              padding: "22px 24px",
              maxWidth: 1080,
              borderRadius: 24,
              background:
                "linear-gradient(180deg, rgba(255, 183, 77, 0.08), rgba(255, 183, 77, 0.04))",
              border: "1px solid rgba(255, 183, 77, 0.18)",
            }}
          >
            <h3
              style={{
                fontSize: "1.06rem",
                fontWeight: 800,
                margin: 0,
              }}
            >
              Khu vực người lớn
            </h3>
            <p
              style={{
                marginTop: 8,
                color: "rgba(255,255,255,0.74)",
              }}
            >
              Nội dung tại đây dành riêng cho người xem từ 18 tuổi trở lên, với
              nhiều video nổi bật, bố cục dễ theo dõi và trải nghiệm xem trực tuyến mượt hơn.
            </p>
          </div>

          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              maxWidth: 1080,
            }}
          >
            <InfoStripItem value="24/7" label="Video mới lên sóng liên tục" />
            <InfoStripItem value="Nổi bật" label="Tập trung nội dung đang hot" />
            <InfoStripItem value="Mượt" label="Xem nhanh, tải ổn định" />
            <InfoStripItem value="Khám phá" label="Dễ tìm các nội dung mới hơn" />
          </div>
        </div>
      </section>

      {heroMovie ? (
        <section
          className="container"
          style={{
            paddingTop: 30,
            paddingBottom: 6,
          }}
        >
          <SectionHeader
            title="⭐ Nổi bật hôm nay"
            desc="Video mở đầu đáng chú ý nhất để vào xem nhanh hơn."
          />

          <HeroFeatureCard item={heroMovie} />
        </section>
      ) : null}

      <div className="container" style={{ paddingTop: 12 }}>
        <ContinueWatching />
      </div>

      <section
        className="container"
        style={{
          paddingTop: 28,
          paddingBottom: 16,
        }}
      >
        <SectionHeader
          title="Nóng nhất hôm nay"
          desc="Loạt video đang kéo view mạnh và được mở xem nhiều nhất."
        />

        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {hotMovies.map((item, index) => (
            <AdultCard key={item._id || item.id} movie={item} priority={index < 4} />
          ))}
        </div>
      </section>

      <section
        className="container"
        style={{
          paddingTop: 28,
          paddingBottom: 70,
        }}
      >
        <SectionHeader
          title="Mới cập nhật liên tục"
          desc="Danh sách video vừa được đẩy lên, xem trước khi thành hàng hot."
        />

        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          }}
        >
          {latestMovies.map((item, index) => (
            <AdultCard key={item._id || item.id} movie={item} priority={index < 4} />
          ))}
        </div>
      </section>
    </main>
  );
}