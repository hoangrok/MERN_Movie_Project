import type { Metadata } from "next";
import Link from "next/link";

const SITE_NAME = "ClipDam18";
const SITE_URL = "https://clipdam18.com";
const PAGE_TITLE = `${SITE_NAME} - Xem clip sex online chất lượng cao`;
const PAGE_DESCRIPTION =
  "Khám phá kho phim 18+ chất lượng cao tại ClipDam18 với phim mới cập nhật, phim thịnh hành và trải nghiệm xem mượt mà.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ClipDam18 home page",
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

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: PAGE_DESCRIPTION,
    inLanguage: "vi-VN",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex min-h-screen flex-col bg-black text-white">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <span className="mb-4 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80">
            Nền tảng xem clip 18+ trực tuyến
          </span>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
            Xem phim clip sex chất lượng cao tại {SITE_NAME}
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            Thưởng thức clip 18+, clip sex mới và nhiều nội dung hấp dẫn với
            giao diện hiện đại, tốc độ tải nhanh và trải nghiệm xem mượt mà.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/search"
              className="rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:opacity-90"
            >
              Tìm phim ngay
            </Link>

            <Link
              href="/latest"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Xem phim mới
            </Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Phim mới cập nhật</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Nội dung mới được cập nhật thường xuyên để người xem không bỏ lỡ
                những clip phim hấp dẫn.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Xem mượt, tải nhanh</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Tối ưu trải nghiệm xem phim trực tuyến với tốc độ ổn định và bố
                cục dễ sử dụng.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Kho clip  đa dạng</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Dễ dàng tìm kiếm các bộ phim nổi bật, phim xu hướng và nhiều thể
                loại khác nhau.
              </p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}