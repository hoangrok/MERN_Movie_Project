import ContinueWatching from "@/components/ContinueWatching";

export const metadata = {
  title: "Tiếp tục xem",
  description: "Danh sách video bạn đang xem dở trên ClipDam18.",
};

export default function ContinueWatchingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 0 70px",
        background:
          "radial-gradient(circle at top, rgba(96, 94, 255, 0.12) 0%, rgba(255,255,255,0.03) 18%, rgba(0,0,0,0) 42%), linear-gradient(180deg, #07090f 0%, #090b12 45%, #040507 100%)",
      }}
    >
      <div className="container">
        <ContinueWatching />
      </div>
    </main>
  );
}