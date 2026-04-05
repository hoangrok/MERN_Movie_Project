"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim() !== "") {
      router.push(`/search?keyword=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleAdvanced = () => {
    router.push("/search/advanced");
  };

  return (
    <div className="search-bar flex items-center gap-2 w-full max-w-xl">
      <form onSubmit={handleSearch} className="flex flex-1 gap-2">
        <input
          type="text"
          placeholder="Tìm phim, clip..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-lg px-4 py-2 bg-[#10131a] text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          Search
        </button>
      </form>
      <button
        onClick={handleAdvanced}
        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
      >
        Tìm kiếm nâng cao
      </button>
    </div>
  );
}