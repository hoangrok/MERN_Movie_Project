import { useEffect, useState } from "react";
import { setSEO } from "../utils/seo";
import "../assets/styles/DesignPreview.scss";

const CONCEPTS = [
  {
    id: "cinematic",
    label: "Option 1",
    name: "Cinematic Premium",
    tag: "Hero-first, high-end, glossy",
    accent: "crimson",
    description:
      "Trang chủ trông như một landing page điện ảnh: hero lớn, typography mạnh, số block ít nhưng rất giàu cảm xúc.",
    bullets: [
      "Hợp khi muốn nâng cảm giác cao cấp ngay từ cái nhìn đầu tiên.",
      "Phần preview hover và backdrop sẽ trở thành điểm ăn tiền chính.",
      "Dễ đẩy trailer, title hot và nội dung độc quyền lên vị trí trung tâm.",
    ],
  },
  {
    id: "feed",
    label: "Option 2",
    name: "Fast Scroll Feed",
    tag: "Quick scan, mobile-heavy, addictive",
    accent: "amber",
    description:
      "Trang chủ ưu tiên tốc độ lướt: filter/search sticky, card gọn, nhịp xem nhanh kiểu feed để giữ đà cuộn.",
    bullets: [
      "Hợp khi traffic mobile nhiều và user thường vào để tìm clip nhanh.",
      "Giảm phụ thuộc hover, tăng thao tác 1 chạm và tìm theo tag.",
      "Có thể tối ưu rất tốt cho homepage chuyển đổi sang play view.",
    ],
  },
  {
    id: "club",
    label: "Option 3",
    name: "Private Club",
    tag: "Personalized, intimate, return-focused",
    accent: "teal",
    description:
      "Trang chủ mang cảm giác web riêng theo gu cá nhân: tiếp tục xem, list đã lưu, thể loại ưa thích và gợi ý theo hành vi.",
    bullets: [
      "Hợp khi muốn tăng retention và cảm giác 'đây là web của mình'.",
      "Tận dụng tốt dữ liệu đã có như liked movies, continue watching, preferred genres.",
      "Vừa khác clone Netflix, vừa có câu chuyện rõ hơn về sản phẩm.",
    ],
  },
];

const MOCK_POSTERS = [
  "Velvet Heat",
  "After Midnight",
  "Private Signal",
  "Room 27",
  "Neon Touch",
  "Crush Theory",
];

function StageHeader({ concept, onChange }) {
  return (
    <div className="designPreview__topbar">
      <div>
        <p className="designPreview__eyebrow">Redesign preview</p>
        <h1>3 hướng làm mới homepage để bạn chốt style nhanh hơn</h1>
      </div>

      <div className="designPreview__switcher" role="tablist" aria-label="Preview options">
        {CONCEPTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === concept.id ? "is-active" : ""}
            onClick={() => onChange(item.id)}
          >
            <span>{item.label}</span>
            <strong>{item.name}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function CinematicStage() {
  return (
    <div className="mockStage mockStage--cinematic">
      <section className="mockHero">
        <div className="mockHero__copy">
          <span className="mockPill">Tonight's spotlight</span>
          <h2>Velvet Heat</h2>
          <p>
            Hero khổ lớn, mood đậm, call-to-action rõ. Phía dưới chỉ còn vài hàng
            nội dung chọn lọc để giữ cảm giác premium.
          </p>

          <div className="mockHero__meta">
            <span>4K Preview</span>
            <span>18+ Curated</span>
            <span>2.4M views</span>
          </div>

          <div className="mockHero__actions">
            <button type="button" className="mockButton mockButton--primary">
              Play now
            </button>
            <button type="button" className="mockButton">
              My list
            </button>
          </div>
        </div>

        <div className="mockHero__visual">
          <div className="mockGlow" />
          <div className="mockHero__poster mockHero__poster--main" />
          <div className="mockHero__poster mockHero__poster--side" />
          <div className="mockHero__stats">
            <span>Retention up</span>
            <strong>Hero-led experience</strong>
          </div>
        </div>
      </section>

      <section className="mockRailGrid">
        <div className="mockPanel">
          <div className="mockPanel__head">
            <span>Because you watched</span>
            <strong>Curated for your mood</strong>
          </div>
          <div className="mockCards">
            {MOCK_POSTERS.slice(0, 3).map((item) => (
              <article key={item} className="mockPosterCard">
                <div className="mockPosterCard__art" />
                <h3>{item}</h3>
                <p>Large cinematic card with hover trailer</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mockSidebar">
          <div className="mockMiniStat">
            <span>Trending pulse</span>
            <strong>#1 Neon Touch</strong>
          </div>
          <div className="mockList">
            {["Continue watching", "Top clip hot", "Saved tonight"].map((item) => (
              <div key={item} className="mockList__row">
                <div className="mockThumb" />
                <div>
                  <strong>{item}</strong>
                  <p>Dense summary block</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FeedStage() {
  return (
    <div className="mockStage mockStage--feed">
      <section className="feedShell">
        <div className="feedBar">
          <div className="feedBar__search">Search, tag, performer, mood...</div>
          <div className="feedBar__chips">
            {["New", "Top", "Asian", "Cosplay", "Roleplay"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="feedList">
          {MOCK_POSTERS.slice(0, 4).map((item, index) => (
            <article key={item} className={`feedCard feedCard--${index + 1}`}>
              <div className="feedCard__media" />
              <div className="feedCard__body">
                <span className="feedCard__tag">{index === 0 ? "Hot now" : "Quick pick"}</span>
                <h2>{item}</h2>
                <p>Card thấp hơn, gọn hơn, thiên về quét nhanh và bấm xem ngay.</p>
                <div className="feedCard__footer">
                  <strong>Play in 1 tap</strong>
                  <span>86% match</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ClubStage() {
  return (
    <div className="mockStage mockStage--club">
      <section className="clubShell">
        <div className="clubWelcome">
          <div>
            <p className="clubWelcome__eyebrow">Good evening, Hoang</p>
            <h2>Your private room is ready</h2>
          </div>
          <div className="clubWelcome__stats">
            <div>
              <span>Continue watching</span>
              <strong>06</strong>
            </div>
            <div>
              <span>Saved</span>
              <strong>18</strong>
            </div>
            <div>
              <span>Favorite genres</span>
              <strong>03</strong>
            </div>
          </div>
        </div>

        <div className="clubGrid">
          <div className="clubPanel clubPanel--feature">
            <div className="clubPanel__head">
              <span>Your mood tonight</span>
              <strong>Slow burn and intimate</strong>
            </div>
            <div className="clubFeature">
              <div className="clubFeature__media" />
              <div className="clubFeature__copy">
                <h3>Picked from your watch history</h3>
                <p>
                  Home xoay quanh cá nhân hóa, ít giống catalog, nhiều giống một
                  lounge riêng cho người xem quay lại mỗi ngày.
                </p>
                <div className="clubFeature__chips">
                  <span>Roleplay</span>
                  <span>Romance</span>
                  <span>POV</span>
                </div>
              </div>
            </div>
          </div>

          <div className="clubPanel">
            <div className="clubPanel__head">
              <span>Resume instantly</span>
              <strong>Continue watching</strong>
            </div>
            <div className="clubResume">
              {[1, 2, 3].map((item) => (
                <div key={item} className="clubResume__row">
                  <div className="mockThumb" />
                  <div className="clubResume__body">
                    <strong>Episode {item}</strong>
                    <p>12 min left</p>
                    <div className="clubResume__bar">
                      <span style={{ width: `${item * 24}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="clubPanel">
            <div className="clubPanel__head">
              <span>Saved for later</span>
              <strong>Your collection</strong>
            </div>
            <div className="clubStack">
              {MOCK_POSTERS.slice(0, 4).map((item) => (
                <div key={item} className="clubStack__card">
                  <div className="clubStack__art" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function renderStage(conceptId) {
  if (conceptId === "feed") return <FeedStage />;
  if (conceptId === "club") return <ClubStage />;
  return <CinematicStage />;
}

export default function DesignPreview() {
  const [activeId, setActiveId] = useState(CONCEPTS[0].id);
  const activeConcept = CONCEPTS.find((item) => item.id === activeId) || CONCEPTS[0];

  useEffect(() => {
    setSEO({
      title: "Design Preview - ClipDam18",
      description: "Preview 3 huong redesign homepage cho ClipDam18.",
      url: "https://www.clipdam18.com/design-preview",
      image: "https://www.clipdam18.com/og-image.jpg",
    });
  }, []);

  return (
    <main className={`designPreview designPreview--${activeConcept.accent}`}>
      <div className="designPreview__background designPreview__background--left" />
      <div className="designPreview__background designPreview__background--right" />

      <div className="designPreview__shell">
        <StageHeader concept={activeConcept} onChange={setActiveId} />

        <section className="designPreview__heroCard">
          <div className="designPreview__heroCopy">
            <span className="designPreview__pill">{activeConcept.tag}</span>
            <h2>{activeConcept.name}</h2>
            <p>{activeConcept.description}</p>

            <div className="designPreview__notes">
              {activeConcept.bullets.map((item) => (
                <div key={item} className="designPreview__note">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="designPreview__heroMeta">
            <div>
              <span>Best for</span>
              <strong>
                {activeConcept.id === "cinematic"
                  ? "premium first impression"
                  : activeConcept.id === "feed"
                    ? "fast mobile browsing"
                    : "returning users and retention"}
              </strong>
            </div>
            <div>
              <span>Build difficulty</span>
              <strong>
                {activeConcept.id === "feed"
                  ? "medium"
                  : activeConcept.id === "club"
                    ? "medium-high"
                    : "high"}
              </strong>
            </div>
            <div>
              <span>Closest to current data</span>
              <strong>
                {activeConcept.id === "club"
                  ? "continueWatching + likedMovies"
                  : activeConcept.id === "feed"
                    ? "search + latest + top"
                    : "featured + preview assets"}
              </strong>
            </div>
          </div>
        </section>

        <section className="designPreview__stage">{renderStage(activeConcept.id)}</section>

        <section className="designPreview__compare">
          {CONCEPTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`designPreview__compareCard ${
                item.id === activeConcept.id ? "is-selected" : ""
              }`}
              onClick={() => setActiveId(item.id)}
            >
              <span>{item.label}</span>
              <strong>{item.name}</strong>
              <p>{item.tag}</p>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
