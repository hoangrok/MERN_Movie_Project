import type { Metadata } from "next";
import Link from "next/link";

const SITE_NAME = "ClipDam18";
const SITE_URL = "https://clipdam18.com";
const PAGE_URL = `${SITE_URL}/adult`;

const PAGE_TITLE = `Nội dung 18+ dành cho người trưởng thành | ${SITE_NAME}`;
const PAGE_DESCRIPTION =
  "Khám phá chuyên mục nội dung 18+ dành cho người trưởng thành tại ClipDam18 với giao diện hiện đại, cập nhật thường xuyên và trải nghiệm xem mượt mà.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/adult",
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Chuyên mục nội dung 18+ tại ClipDam18",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

export default function AdultPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Nội dung 18+",
        item: PAGE_URL,
      },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Nội dung 18+ dành cho người trưởng thành",
    url: PAGE_URL,
    description: PAGE_DESCRIPTION,
    inLanguage: "vi-VN",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Chuyên mục này dành cho ai?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chuyên mục này dành cho người dùng trưởng thành từ 18 tuổi trở lên theo quy định áp dụng tại khu vực của họ.",
        },
      },
      {
        "@type": "Question",
        name: "Nội dung có được cập nhật thường xuyên không?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nội dung trong chuyên mục được định hướng cập nhật thường xuyên để người dùng dễ theo dõi các video và danh mục mới.",
        },
      },
      {
        "@type": "Question",
        name: "Có thể xem trên điện thoại không?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Có. Giao diện được tối ưu cho điện thoại, máy tính bảng và máy tính để bàn.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="min-h-screen text-white">
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-20 pb-14 text-center">
          <span className="mb-5 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            Chuyên mục dành cho người trưởng thành 18+
          </span>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
            Nội dung 18+ dành cho người trưởng thành
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-white/70 md:text-lg">
            Chuyên mục 18+ tại {SITE_NAME} được xây dựng dành cho người dùng
            trưởng thành, với nội dung được sắp xếp rõ ràng, dễ tìm kiếm và tối
            ưu trải nghiệm xem trực tuyến. Hệ thống hỗ trợ tốc độ tải nhanh, bố
            cục trực quan và khả năng khám phá nội dung theo nhóm phù hợp.
          </p>

<div className="mt-10 flex flex-wrap items-center justify-center gap-4">
  <Link
    href="/adult"
    className="rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:opacity-90"
  >
    Chuyên mục 18+
  </Link>

  <Link
    href="/"
    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
  >
    Về trang chủ
  </Link>

  <Link
    href="/latest"
    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
  >
    Nội dung mới cập nhật
  </Link>
</div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-10">
          <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 text-left">
            <h2 className="text-xl font-semibold text-yellow-100">
              Thông báo độ tuổi
            </h2>
            <p className="mt-3 text-sm leading-7 text-yellow-50/85 md:text-base">
              Chuyên mục này chỉ dành cho người dùng từ 18 tuổi trở lên. Vui
              lòng đảm bảo bạn đáp ứng độ tuổi phù hợp theo quy định tại khu vực
              của mình trước khi tiếp tục truy cập và sử dụng nội dung.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Nội dung mới cập nhật</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Theo dõi các nội dung mới được bổ sung thường xuyên với cách sắp
                xếp rõ ràng, dễ xem và dễ khám phá hơn.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Danh mục nổi bật</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Nội dung được định hướng phân loại theo từng nhóm để người dùng
                trưởng thành có thể tiếp cận nhanh hơn với sở thích phù hợp.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Xem mượt, tải nhanh</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Giao diện được tối ưu để mang lại trải nghiệm xem trực tuyến ổn
                định trên nhiều thiết bị khác nhau.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold md:text-3xl">
              Khám phá nội dung 18+ theo hướng rõ ràng hơn
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-8 text-white/70 md:text-base">
              Thay vì hiển thị rời rạc, chuyên mục này được xây dựng như một
              landing page nền tảng để hỗ trợ index sớm trên công cụ tìm kiếm.
              Khi hệ thống có dữ liệu thật, trang sẽ tiếp tục mở rộng thành các
              nhóm nội dung, các danh sách mới cập nhật và từng trang chi tiết
              riêng cho mỗi video.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <h3 className="text-lg font-semibold">Mục tiêu SEO giai đoạn đầu</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Xây nền nội dung rõ chủ đề, có title riêng, description riêng,
                  internal link và schema phù hợp để domain được index sớm.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <h3 className="text-lg font-semibold">Mở rộng khi có dữ liệu thật</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Sau này có thể phát triển tiếp thành trang danh mục, trang chi
                  tiết nội dung, sitemap động và metadata theo từng item.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-20">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-semibold md:text-3xl">
              Câu hỏi thường gặp
            </h2>

            <div className="mt-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold">
                  Chuyên mục này dành cho ai?
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/70 md:text-base">
                  Chuyên mục này chỉ dành cho người dùng trưởng thành từ 18 tuổi
                  trở lên theo quy định áp dụng tại nơi bạn sinh sống.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold">
                  Có thể xem trên điện thoại không?
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/70 md:text-base">
                  Có. Giao diện được tối ưu cho điện thoại, máy tính bảng và máy
                  tính để bàn để mang lại trải nghiệm xem thuận tiện hơn.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold">
                  Nội dung có được cập nhật thường xuyên không?
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/70 md:text-base">
                  Hệ thống được định hướng cập nhật nội dung định kỳ để người
                  dùng dễ dàng theo dõi các video và danh mục mới.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}