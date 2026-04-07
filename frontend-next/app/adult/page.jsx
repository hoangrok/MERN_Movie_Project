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
  title: "Nội dung 18+ dành cho người trưởng thành",
  subtitle:
    "Chuyên mục 18+ tại ClipDam18 được xây dựng dành cho người dùng trưởng thành, với nội dung được sắp xếp rõ ràng, dễ tìm kiếm và tối ưu trải nghiệm xem trực tuyến.",
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
      className={primary ? "adultCta adultCta--primary" : "adultCta adultCta--ghost"}
    >
      {children}
    </a>
  );
}

function VideoCard({ item, large = false }) {
  return (
    <a
      href={`/adult/${item.slug}`}
      className="adultPageCard"
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
            left: 18,
            right: 18,
            bottom: 18,
          }}
        >
          <h3 className="line-clamp-2">{item.title}</h3>

          <p style={{ marginTop: 8 }}>
            {item.displayViews || "Mới cập nhật"}
          </p>
        </div>
      </div>
    </a>
  );
}

function InfoStripItem({ value, label }) {
  return (
    <div className="surface" style={{ padding: "16px 18px" }}>
      <div style={{ fontWeight: 800, color: "#fff" }}>{value}</div>
      <div style={{ marginTop: 6, color: "rgba(255,255,255,0.64)" }}>
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
    <main>
      <section className="container" style={{ paddingTop: 80 }}>
        <div className="kicker">{featuredVideo.badge}</div>

        <h1 style={{ marginTop: 20 }}>{featuredVideo.title}</h1>

        <p style={{ marginTop: 18 }}>{featuredVideo.subtitle}</p>

        <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
          <CTAButton href="/" primary>
            Về trang chủ
          </CTAButton>

          <CTAButton href="/adult">
            Nội dung mới cập nhật
          </CTAButton>
        </div>

        <div className="surface" style={{ marginTop: 30, padding: 20 }}>
          <h3>Thông báo độ tuổi</h3>
          <p style={{ marginTop: 8 }}>
            Chuyên mục này chỉ dành cho người dùng từ 18 tuổi trở lên.
          </p>
        </div>
      </section>

      <div className="container" style={{ marginTop: 40 }}>
        <ContinueWatching />
      </div>

      <section className="container" style={{ marginTop: 40 }}>
        <SectionHeader title="Hot hôm nay" />

        <div style={{ display: "grid", gap: 20 }}>
          {hotMovies.map((item) => (
            <VideoCard key={item._id} item={item} />
          ))}
        </div>
      </section>

      <section className="container" style={{ marginTop: 40 }}>
        <SectionHeader title="Mới cập nhật" />

        <div style={{ display: "grid", gap: 20 }}>
          {latestMovies.map((item) => (
            <VideoCard key={item._id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}