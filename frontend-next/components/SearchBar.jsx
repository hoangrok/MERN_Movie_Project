"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://dam18-api.onrender.com/api";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const keyword = query.trim();

    if (!keyword) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${API_BASE}/movies?search=${encodeURIComponent(keyword)}&limit=8`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await res.json().catch(() => null);
        const items =
          data?.movies ||
          data?.results ||
          data?.data ||
          (Array.isArray(data) ? data : []);

        setResults(Array.isArray(items) ? items.slice(0, 8) : []);
        setOpen(true);
      } catch (error) {
        if (error?.name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleAdvanced = () => {
    setOpen(false);
    router.push("/search/advanced");
  };

  const getHref = (item) => {
    if (item?.slug) return `/adult/${item.slug}`;
    if (item?._id) return `/adult/${item._id}`;
    return "/adult";
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <div className="search-bar flex items-center gap-2 w-full">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            type="text"
            placeholder="Tìm video theo tên, nội dung..."
            value={query}
            onFocus={() => {
              if (query.trim()) setOpen(true);
            }}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-xl px-4 py-2.5 bg-[#10131a] text-white placeholder:text-gray-400 focus:outline-none border border-white/10 focus:ring-2 focus:ring-white/20"
          />
          <button
            type="submit"
            className="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-xl font-bold"
          >
            Tìm
          </button>
        </form>

        <button
          onClick={handleAdvanced}
          className="bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-xl border border-white/10"
        >
          Nâng cao
        </button>
      </div>

      {open && query.trim() ? (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1118]/95 backdrop-blur-xl shadow-2xl">
          {loading ? (
            <div className="px-4 py-4 text-sm text-white/70">Đang tìm video...</div>
          ) : results.length > 0 ? (
            <>
              {results.map((item) => (
                <button
                  key={item?._id || item?.slug || item?.title}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(getHref(item));
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left border-b border-white/5 hover:bg-white/5"
                >
                  <img
                    src={
                      item?.displayImage ||
                      item?.displayBackdrop ||
                      item?.poster ||
                      item?.backdrop ||
                      "https://dummyimage.com/160x90/111827/ffffff&text=Video"
                    }
                    alt={item?.title || "video"}
                    className="h-14 w-24 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-white">
                      {item?.title || "Video không có tiêu đề"}
                    </div>
                    <div className="truncate text-sm text-white/60">
                      {item?.displayViews || item?.displayDuration || "Nội dung liên quan"}
                    </div>
                  </div>
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }}
                className="w-full px-4 py-3 text-sm font-bold text-white bg-white/5 hover:bg-white/10"
              >
                Xem tất cả kết quả cho “{query.trim()}”
              </button>
            </>
          ) : (
            <div className="px-4 py-4 text-sm text-white/70">
              Không tìm thấy video phù hợp
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}