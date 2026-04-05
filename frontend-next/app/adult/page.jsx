export const metadata = {
  title: "Clip 18+ | ClipDam18",
  description:
    "Xem clip 18+ mới nhất, danh sách video hot, cập nhật liên tục tại ClipDam18.",
  robots: "index, follow",
  openGraph: {
    title: "Clip 18+ | ClipDam18",
    description:
      "Xem clip 18+ mới nhất, danh sách video hot, cập nhật liên tục tại ClipDam18.",
    url: "https://clipdam18.com/adult",
    siteName: "ClipDam18",
    type: "website",
  },
};

const featuredVideo = {
  title: "Kho nội dung 18+ chọn lọc",
  subtitle:
    "Tổng hợp các video mới, hot và cập nhật liên tục với giao diện xem hiện đại, tối ưu cho desktop và mobile.",
  badge: "18+",
};

const hotVideos = [
  {
    id: 1,
    title: "Clip mới nổi bật 01",
    category: "Hot",
    duration: "12 phút",
    views: "24.5K lượt xem",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    title: "Clip mới nổi bật 02",
    category: "Xu hướng",
    duration: "18 phút",
    views: "31.2K lượt xem",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    title: "Clip mới nổi bật 03",
    category: "Nổi bật",
    duration: "10 phút",
    views: "19.8K lượt xem",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 4,
    title: "Clip mới nổi bật 04",
    category: "Đề xuất",
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

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2
        style={{
          fontSize: "1.8rem",
          fontWeight: 800,
          color: "#fff",
          margin: 0,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>
      {sub ? (
        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            color: "rgba(255,255,255,0.72)",
            fontSize: "0.98rem",
            lineHeight: 1.6,
          }}
        >
          {sub}
        </p>
      ) : null}
    </div>
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
        borderRadius: 22,
        overflow: "hidden",
        background: "#11131a",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: large ? 260 : 220,
          overflow: "hidden",
          background: "#0f1117",
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
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(5,8,15,0.95) 0%, rgba(5,8,15,0.2) 45%, rgba(5,8,15,0.08) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(255, 92, 92, 0.18)",
              color: "#ff8a8a",
              fontSize: "0.78rem",
              fontWeight: 700,
              border: "1px solid rgba(255, 92, 92, 0.25)",
              backdropFilter: "blur(8px)",
            }}
          >
            {item.category}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(8px)",
            }}
          >
            {item.duration}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#fff",
              fontSize: large ? "1.15rem" : "1rem",
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            {item.title}
          </h3>
          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "rgba(255,255,255,0.78)",
              fontSize: "0.9rem",
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
          "radial-gradient(circle at top, #11192d 0%, #090b12 40%, #05070d 100%)",
        color: "#fff",
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
              "linear-gradient(135deg, rgba(255,72,72,0.16) 0%, rgba(90,70,255,0.12) 50%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "72px 20px 56px",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#ffd6d6",
              fontSize: "0.88rem",
              fontWeight: 700,
              marginBottom: 18,
            }}
          >
            🔥 {featuredVideo.badge} Section
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.2rem, 5vw, 4.6rem)",
              lineHeight: 1.05,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              maxWidth: 760,
            }}
          >
            {featuredVideo.title}
          </h1>

          <p
            style={{
              marginTop: 18,
              marginBottom: 0,
              maxWidth: 760,
              color: "rgba(255,255,255,0.78)",
              fontSize: "1.05rem",
              lineHeight: 1.8,
            }}
          >
            {featuredVideo.subtitle}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              marginTop: 28,
            }}
          >
            <a
              href="#hot-section"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 48,
                padding: "0 20px",
                borderRadius: 14,
                background: "#ffffff",
                color: "#05070d",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Xem danh sách hot
            </a>

            <a
              href="#latest-section"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 48,
                padding: "0 20px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              Mới cập nhật
            </a>
          </div>
        </div>
      </section>

      <section
        id="hot-section"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "42px 20px 12px",
        }}
      >
        <SectionTitle
          title="Hot hôm nay"
          sub="Danh sách nội dung nổi bật đang được xem nhiều."
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
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "36px 20px 60px",
        }}
      >
        <SectionTitle
          title="Mới cập nhật"
          sub="Các video mới được thêm gần đây."
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