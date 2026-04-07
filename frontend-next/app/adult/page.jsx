import ContinueWatching from "@/components/ContinueWatching";
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
  title: "Nội dung 18+ hiện đại, tối giản và cuốn hơn",
  subtitle:
    "Khám phá danh sách clip hot, video mới cập nhật và nội dung đang được xem nhiều với giao diện tối ưu cho cả desktop lẫn mobile.",
  badge: "Chuyên mục dành cho người trưởng thành 18+",
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 52,
        padding: "0 22px",
        borderRadius: 16,
        textDecoration: "none",
        fontWeight: 800,
        fontSize: "0.97rem",
        letterSpacing: "-0.01em",
        transition: "all 0.25s ease",
        cursor: "pointer",
        background: primary
          ? "#ffffff"
          : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
        color: primary ? "#05070d" : "#ffffff",
        border: primary
          ? "1px solid rgba(255,255,255,0.85)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: primary
          ? "0 14px 32px rgba(255,255,255,0.08)"
          : "0 14px 32px rgba(0,0,0,0.18)",
      }}
    >
      {children}
    </a>
  );
}

function VideoCard({ item, large = false }) {
  return (
    <a
      href={`/adult/${item.slug}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: large ? 300 : 236,
          background: "#0d1118",
          overflow: "hidden",
        }}
      >
        <img
          src={item.displayImage || item.image}
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
              "linear-gradient(to top, rgba(3,6,12,0.98) 0%, rgba(3,6,12,0.5) 44%, rgba(3,6,12,0.08) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 16,
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
              minHeight: 32,
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
            {item.category || (item.newPopular ? "Nổi bật" : "18+")}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 32,
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
            {item.displayDuration || item.duration || "HD"}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 18,
          }}
        >
          <h3
            className="line-clamp-2"
            style={{
              margin: 0,
              fontFamily:
                "var(--font-manrope), var(--font-inter), Arial, sans-serif",
              fontSize: large ? "1.16rem" : "1rem",
              lineHeight: 1.3,
              letterSpacing: "-0.025em",
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            {item.title}
          </h3>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: "0.92rem",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {item.displayViews || item.views || "Mới cập nhật"}
          </p>
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
      }}
    >
      <div
        style={{
          fontFamily:
            "var(--font-manrope), var(--font-inter), Arial, sans-serif",
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

  const hotMovies = movies.slice(0, 4);
  const latestMovies = movies.slice(4);

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
            paddingTop: 86,
            paddingBottom: 70,
          }}
        >
          <div className="kicker">{featuredVideo.badge}</div>

          <h1
            className="heading-xl"
            style={{
              maxWidth: 880,
              marginTop: 20,
              color: "#ffffff",
            }}
          >
            {featuredVideo.title}
          </h1>

          <p
            className="body-lg"
            style={{
              maxWidth: 780,
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
            }}
          >
            <CTAButton href="/" primary>
              Về trang chủ
            </CTAButton>

            <CTAButton href="/adult">Vào danh mục 18+</CTAButton>
          </div>

          <div
            className="surface"
            style={{
              marginTop: 34,
              padding: "22px 24px",
              maxWidth: 980,
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
              Thông báo độ tuổi
            </h3>
            <p
              style={{
                marginTop: 8,
                color: "rgba(255,255,255,0.74)",
              }}
            >
              Chuyên mục này chỉ dành cho người dùng từ 18 tuổi trở lên. Vui
              lòng đảm bảo bạn đáp ứng độ tuổi phù hợp theo quy định tại khu
              vực của mình trước khi tiếp tục truy cập và sử dụng nội dung.
            </p>
          </div>

          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              maxWidth: 980,
            }}
          >
            <InfoStripItem value="24/7" label="Nội dung mới cập nhật" />
            <InfoStripItem value="Hot" label="Danh mục nổi bật" />
            <InfoStripItem value="Mượt" label="Xem nhanh, tối ưu tải" />
            <InfoStripItem value="Premium" label="Giao diện hiện đại" />
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingTop: 26 }}>
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
          title="Hot hôm nay"
          desc="Những nội dung nổi bật đang được xem nhiều, trình bày theo layout hiện đại và dễ nhìn hơn."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {hotMovies.map((item) => (
            <VideoCard key={item._id} item={item} large />
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
          title="Mới cập nhật"
          desc="Danh sách video mới được thêm gần đây, bố cục gọn hơn và dễ mở rộng cho dữ liệu thật."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          {latestMovies.map((item) => (
            <VideoCard key={item._id} item={item} />
          ))}
        </div>
      </section>

      <style jsx>{`
        a:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </main>
  );
}