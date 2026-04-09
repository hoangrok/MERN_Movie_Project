import ContinueWatching from "@/components/ContinueWatching";
import AdultCard from "@/components/AdultCard";
import { getAdultMovies } from "@/lib/api";

export const metadata = {
  title: "Clip 18+",
  description: "Kho video 18+ cập nhật liên tục tại ClipDam18.",
};

export default async function AdultPage() {
  const movies = await getAdultMovies();

  const hero = movies[0];
  const trending = movies.slice(1, 7);
  const latest = movies.slice(7, 19);

  return (
    <main className="homeWrap">
      {/* HERO */}
      {hero && (
        <section className="hero">
          <div
            className="heroBg"
            style={{
              backgroundImage: `url(${hero.displayBackdrop || hero.displayImage})`,
            }}
          />

          <div className="heroOverlay" />

          <div className="container heroContent">
            <div className="heroText">
              <div className="kicker">🔥 Trending</div>

              <h1 className="heroTitle">{hero.title}</h1>

              <p className="heroDesc">
                {hero.description || "Nội dung đang được xem nhiều nhất."}
              </p>

              <div className="heroMeta">
                <span>{hero.displayDuration || "HD"}</span>
                <span>•</span>
                <span>{hero.displayViews || "Hot"}</span>
              </div>

              <div className="heroActions">
                <a href={`/adult/${hero.slug}`} className="btnPrimary">
                  ▶ Xem ngay
                </a>

                <a href="/latest" className="btnGhost">
                  Mới cập nhật
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CONTINUE */}
      <div className="container">
        <ContinueWatching />
      </div>

      {/* TRENDING */}
      <section className="container section">
        <SectionHeader
          title="🔥 Đang hot"
          desc="Những video đang được xem nhiều nhất hiện tại."
        />

        <div className="grid">
          {trending.map((m, i) => (
            <AdultCard key={m._id} movie={m} priority={i < 4} />
          ))}
        </div>
      </section>

      {/* LATEST */}
      <section className="container section">
        <SectionHeader
          title="🆕 Mới cập nhật"
          desc="Video vừa upload, chưa ai xem nhiều."
        />

        <div className="grid">
          {latest.map((m, i) => (
            <AdultCard key={m._id} movie={m} priority={i < 4} />
          ))}
        </div>
      </section>

      <style jsx>{`
        .homeWrap {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(96,94,255,0.12), transparent 40%),
            linear-gradient(180deg, #07090f, #040507);
        }

        /* HERO */
        .hero {
          position: relative;
          height: 70vh;
          min-height: 520px;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }

        .heroBg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: blur(10px) brightness(0.6);
          transform: scale(1.1);
        }

        .heroOverlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(4,7,14,0.95) 10%,
            rgba(4,7,14,0.6) 50%,
            rgba(4,7,14,0.2) 100%
          );
        }

        .heroContent {
          position: relative;
          z-index: 2;
          padding-bottom: 60px;
        }

        .heroText {
          max-width: 680px;
        }

        .heroTitle {
          font-size: clamp(2rem, 5vw, 3.6rem);
          font-weight: 900;
          margin-top: 14px;
        }

        .heroDesc {
          margin-top: 12px;
          color: rgba(255,255,255,0.7);
        }

        .heroMeta {
          margin-top: 14px;
          display: flex;
          gap: 8px;
          color: rgba(255,255,255,0.7);
        }

        .heroActions {
          margin-top: 20px;
          display: flex;
          gap: 12px;
        }

        .btnPrimary {
          padding: 12px 20px;
          border-radius: 12px;
          background: #fff;
          color: #000;
          font-weight: 800;
          text-decoration: none;
        }

        .btnGhost {
          padding: 12px 20px;
          border-radius: 12px;
          background: rgba(255,255,255,0.1);
          color: #fff;
          text-decoration: none;
        }

        /* SECTION */
        .section {
          padding-top: 40px;
          padding-bottom: 20px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
      `}</style>
    </main>
  );
}

/* HEADER */
function SectionHeader({ title, desc }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 className="section-title">{title}</h2>
      <p className="section-desc">{desc}</p>
    </div>
  );
}