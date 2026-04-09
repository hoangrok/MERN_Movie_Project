import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, rgba(120, 89, 255, 0.14), transparent 40%), linear-gradient(180deg, #07090f, #040507)",
        textAlign: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 800 }}>
        <h1 className="heading-xl">
          ClipDam18
        </h1>

        <p
          style={{
            marginTop: 16,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          Kho nội dung video chất lượng cao, cập nhật liên tục mỗi ngày.
        </p>

        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            marginTop: 30,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/adult"
            style={{
              padding: "14px 24px",
              borderRadius: 12,
              background: "#fff",
              color: "#000",
              fontWeight: 800,
            }}
          >
            Vào khu 18+
          </Link>

          <Link
            href="/latest"
            style={{
              padding: "14px 24px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.1)",
              fontWeight: 700,
            }}
          >
            Mới cập nhật
          </Link>
        </div>
      </div>
    </main>
  );
}