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
  title: "Kho clip 18+ hiện đại, tối giản và cuốn hơn",
  subtitle:
    "Tổng hợp nội dung hot, mới cập nhật và được xem nhiều với giao diện tối ưu trải nghiệm xem trên desktop lẫn mobile.",
  badge: "18+ Premium",
};

const hotVideos = [
  {
    id: 1,
    title: "Clip nổi bật hôm nay 01",
    category: "Hot",
    duration: "12 phút",
    views: "24.5K lượt xem",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    title: "Clip nổi bật hôm nay 02",
    category: "Trending",
    duration: "18 phút",
    views: "31.2K lượt xem",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    title: "Clip nổi bật hôm nay 03",
    category: "Đề xuất",
    duration: "10 phút",
    views: "19.8K lượt xem",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 4,
    title: "Clip nổi bật hôm nay 04",
    category: "Phổ biến",
    duration: "15 phút",
    views: "27.1K lượt xem",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  },
];

const latestVideos = [
  {
    id: 5,
    title: "Cập nhật mới 01",
    category: "Mới cập nhật",
    duration: "14 phút",
    views: "8.6K lượt xem",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 6,
    title: "Cập nhật mới 02",
    category: "Mới cập nhật",
    duration: "11 phút",
    views: "12.1K lượt xem",
    image:
      "https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 7,
    title: "Cập nhật mới 03",
    category: "Mới cập nhật",
    duration: "09 phút",
    views: "6.4K lượt xem",
    image:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 8,
    title: "Cập nhật mới 04",
    category: "Mới cập nhật",
    duration: "16 phút",
    views: "9.9K lượt xem",
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 9,
    title: "Cập nhật mới 05",
    category: "Mới cập nhật",
    duration: "21 phút",
    views: "14.2K lượt xem",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 10,
    title: "Cập nhật mới 06",
    category: "Mới cập nhật",
    duration: "13 phút",
    views: "7.7K lượt xem",
    image:
      "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80",
  },
];

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
        minHeight: 48,
        padding: "0 20px",
        borderRadius: 14,
        textDecoration: "none",
        fontWeight: 700,
        fontSize: "0.96rem",
        letterSpacing: "-0.01em",
        transition: "all 0.25s ease",
        background: primary ? "#ffffff" : "rgba(255,255,255,0.08)",
        color: primary ? "#05070d" : "#ffffff",
        border: primary
          ? "1px solid rgba(255,255,255,0.8)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: primary ? "0 12px 30px rgba(255,255,255,0.08)" : "none",
      }}
    >
      {children}
    </a>
  );
}

function VideoCard({ item, large = false }) {
  return (
    <a
      href="#"
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
          height: large ? 285 : 230,
          background: "#0d1118",
          overflow: "hidden",
        }}
      >
        <img
          src={item.image}
          alt={item.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: "scale(1.01)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(3,6,12,0.96) 0%, rgba(3,6,12,0.48) 45%, rgba(3,6,12,0.12) 100%)",
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
              color: "#ff9d9d",
              fontSize: "0.78rem",
              fontWeight: 700,
              backdropFilter: "blur(10px)",
            }}
          >
            {item.category}
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
            {item.duration}
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
              fontSize: large ? "1.14rem" : "1rem",
              lineHeight: 1.3,
              letterSpacing: "-0.025em",
              fontWeight: 700,
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
            {item.views}
          </p>
        </div>
      </div>
    </a>
  );
}

export default function AdultPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(96, 94, 255, 0.12) 0%, rgba(255,255,255,0.03) 18%, rgba(0,0,0,0) 42%), linear-gradient(180deg, #07090f 0%, #090b12 45%, #040507 100%)",
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
              "linear-gradient(135deg, rgba(255,72,72,0.15) 0%, rgba(92,83,255,0.12) 52%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
          }}
        />

        <div
          className="container"
          style={{
            position: "relative",
            zIndex: 2,
            paddingTop: 82,
            paddingBottom: 62,
          }}
        >
          <div className="kicker">{featuredVideo.badge}</div>

          <h1
            className="heading-xl"
            style={{
              maxWidth: 860,
              marginTop: 18,
              color: "#ffffff",
            }}
          >
            {featuredVideo.title}
          </h1>

          <p
            className="body-lg"
            style={{
              maxWidth: 760,
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
            <CTAButton href="#hot-section" primary>
              Xem nội dung hot
            </CTAButton>

            <CTAButton href="#latest-section">Mới cập nhật</CTAButton>
          </div>

          <div
            style={{
              marginTop: 38,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              maxWidth: 900,
            }}
          >
            {[
              { label: "Cập nhật liên tục", value: "24/7" },
              { label: "Danh mục nổi bật", value: "Hot" },
              { label: "Trải nghiệm hiện đại", value: "Premium" },
              { label: "Tối ưu giao diện", value: "Desktop + Mobile" },
            ].map((item) => (
              <div
                key={item.label}
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
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "#ffffff",
                  }}
                >
                  {item.value}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: "0.9rem",
                    lineHeight: 1.55,
                    color: "rgba(255,255,255,0.64)",
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="hot-section"
        className="container"
        style={{
          paddingTop: 42,
          paddingBottom: 18,
        }}
      >
        <SectionHeader
          title="Hot hôm nay"
          desc="Những nội dung nổi bật đang được xem nhiều, hiển thị theo phong cách hiện đại và dễ theo dõi hơn."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {hotVideos.map((item) => (
            <VideoCard key={item.id} item={item} large />
          ))}
        </div>
      </section>

      <section
        id="latest-section"
        className="container"
        style={{
          paddingTop: 28,
          paddingBottom: 70,
        }}
      >
        <SectionHeader
          title="Mới cập nhật"
          desc="Danh sách video mới được thêm gần đây với bố cục gọn, đậm chất premium và dễ mở rộng sau này khi nối dữ liệu thật."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 18,
          }}
        >
          {latestVideos.map((item) => (
            <VideoCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}