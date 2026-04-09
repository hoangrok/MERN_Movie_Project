import ContinueWatching from "@/components/ContinueWatching";
import AdultCard from "@/components/AdultCard";
import { getAdultMovies } from "@/lib/api";

export const metadata = {
  title: "Clip 18+",
  description: "Kho video 18+ cập nhật liên tục tại ClipDam18.",
};

const styles = {
  homeWrap: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(96,94,255,0.12), transparent 40%), linear-gradient(180deg, #07090f, #040507)",
  },
  hero: {
    position: "relative",
    minHeight: "620px",
    display: "flex",
    alignItems: "flex-end",
    overflow: "hidden",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  heroBg: (image) => ({
    position: "absolute",
    inset: 0,
    backgroundImage: `url(${image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transform: "scale(1.08)",
    filter: "blur(8px) brightness(0.52)",
  }),
  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(4,7,14,0.98) 8%, rgba(4,7,14,0.72) 36%, rgba(4,7,14,0.34) 58%, rgba(4,7,14,0.12) 100%)",
  },
  heroGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 22% 30%, rgba(255,92,92,0.18), transparent 26%), radial-gradient(circle at 78% 18%, rgba(96,94,255,0.18), transparent 26%)",
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    paddingTop: 120,
    paddingBottom: 72,
  },
  heroCard: {
    maxWidth: 760,
    padding: "26px 26px 24px",
    borderRadius: 28,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow:
      "0 22px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.05)",
    backdropFilter: "blur(14px)",
  },
  heroTitle: {
    fontSize: "clamp(2.2rem, 5vw, 4rem)",
    fontWeight: 900,
    lineHeight: 0.95,
    letterSpacing: "-0.05em",
    margin: "16px 0 0",
    color: "#fff",
  },
  heroDesc: {
    marginTop: 14,
    maxWidth: 680,
    color: "rgba(255,255,255,0.76)",
    fontSize: "1rem",
    lineHeight: 1.7,
  },
  heroMeta: {
    marginTop: 18,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  heroMetaPill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 38,
    padding: "0 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    fontSize: "0.88rem",
    fontWeight: 800,
  },
  heroActions: {
    marginTop: 22,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "0 20px",
    borderRadius: 14,
    background: "#fff",
    color: "#05070d",
    fontWeight: 800,
    textDecoration: "none",
    boxShadow: "0 12px 28px rgba(255,255,255,0.12)",
  },
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "0 20px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    textDecoration: "none",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  heroStrip: {
    marginTop: 22,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
  },
  heroStripItem: {
    padding: "14px 16px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  heroStripValue: {
    color: "#fff",
    fontWeight: 800,
    fontSize: "1rem",
  },
  heroStripLabel: {
    marginTop: 6,
    color: "rgba(255,255,255,0.64)",
    fontSize: "0.88rem",
    lineHeight: 1.5,
  },
  section: {
    paddingTop: 38,
    paddingBottom: 16,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    margin: 0,
  },
  sectionDesc: {
    marginTop: 8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 22,
  },
};

export default async function AdultPage() {
  const movies = await getAdultMovies();

  const hero = movies[0] || null;
  const continueHint = movies.slice(1, 7);
  const trending = movies.slice(7, 13);
  const latest = movies.slice(13, 25);

  return (
    <main style={styles.homeWrap}>
      {hero ? (
        <section style={styles.hero}>
          <div
            style={styles.heroBg(
              hero.displayBackdrop || hero.displayImage || hero.poster || ""
            )}
          />
          <div style={styles.heroOverlay} />
          <div style={styles.heroGlow} />

          <div className="container" style={styles.heroContent}>
            <div style={styles.heroCard}>
              <div className="kicker">🔥 Trending now</div>

              <h1 style={styles.heroTitle}>{hero.title}</h1>

              <p style={styles.heroDesc}>
                {hero.description ||
                  "Nội dung đang được xem nhiều và nổi bật nhất hiện tại."}
              </p>

              <div style={styles.heroMeta}>
                <span style={styles.heroMetaPill}>
                  {hero.displayDuration || "HD"}
                </span>
                <span style={styles.heroMetaPill}>
                  {hero.displayViews || "Hot"}
                </span>
                {Array.isArray(hero.genre) && hero.genre.length ? (
                  <span style={styles.heroMetaPill}>
                    {hero.genre.slice(0, 2).join(" • ")}
                  </span>
                ) : null}
              </div>

              <div style={styles.heroActions}>
                <a href={`/adult/${hero.slug}`} style={styles.btnPrimary}>
                  ▶ Xem ngay
                </a>

                <a href="/latest" style={styles.btnGhost}>
                  Mới cập nhật
                </a>

                <a href="/trending" style={styles.btnGhost}>
                  Top lượt xem
                </a>
              </div>

              <div style={styles.heroStrip}>
                <div style={styles.heroStripItem}>
                  <div style={styles.heroStripValue}>24/7</div>
                  <div style={styles.heroStripLabel}>
                    Video mới được cập nhật liên tục mỗi ngày.
                  </div>
                </div>

                <div style={styles.heroStripItem}>
                  <div style={styles.heroStripValue}>Mượt</div>
                  <div style={styles.heroStripLabel}>
                    Tối ưu trải nghiệm xem nhanh và tải ổn định.
                  </div>
                </div>

                <div style={styles.heroStripItem}>
                  <div style={styles.heroStripValue}>Nổi bật</div>
                  <div style={styles.heroStripLabel}>
                    Tập trung các nội dung đang hot và được quan tâm.
                  </div>
                </div>

                <div style={styles.heroStripItem}>
                  <div style={styles.heroStripValue}>Cày lâu</div>
                  <div style={styles.heroStripLabel}>
                    Giao diện tối, thoải mái mắt và dễ khám phá hơn.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="container" style={{ paddingTop: 24 }}>
        <ContinueWatching />
      </div>

      {!!continueHint.length && (
        <section className="container" style={styles.section}>
          <SectionHeader
            title="⚡ Gợi ý xem tiếp"
            desc="Những video mới đáng chú ý để bạn nhảy vào nhanh hơn."
          />

          <div style={styles.grid}>
            {continueHint.map((movie, index) => (
              <AdultCard key={movie._id || movie.id} movie={movie} priority={index < 4} />
            ))}
          </div>
        </section>
      )}

      {!!trending.length && (
        <section className="container" style={styles.section}>
          <SectionHeader
            title="🔥 Đang hot"
            desc="Những video đang được xem nhiều nhất hiện tại."
          />

          <div style={styles.grid}>
            {trending.map((movie, index) => (
              <AdultCard key={movie._id || movie.id} movie={movie} priority={index < 4} />
            ))}
          </div>
        </section>
      )}

      {!!latest.length && (
        <section
          className="container"
          style={{
            ...styles.section,
            paddingBottom: 70,
          }}
        >
          <SectionHeader
            title="🆕 Mới cập nhật"
            desc="Video vừa upload, mới lên sóng và còn rất mới."
          />

          <div style={styles.grid}>
            {latest.map((movie, index) => (
              <AdultCard key={movie._id || movie.id} movie={movie} priority={index < 4} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function SectionHeader({ title, desc }) {
  return (
    <div style={styles.sectionHeader}>
      <h2 className="section-title" style={styles.sectionTitle}>
        {title}
      </h2>
      <p className="section-desc" style={styles.sectionDesc}>
        {desc}
      </p>
    </div>
  );
}