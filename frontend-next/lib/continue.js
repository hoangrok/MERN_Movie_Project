const KEY = "dam18_continue";
const MAX_ITEMS = 24;
const FINISH_THRESHOLD = 0.95; // 95% coi như xem xong

// 👉 Lưu progress
export function saveContinue(movie, currentTime = 0, duration = 0) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");

    const safeDuration =
      typeof duration === "number" && duration > 0 ? duration : 0;

    const progress =
      safeDuration > 0 ? Math.min(currentTime / safeDuration, 1) : 0;

    // 👉 nếu xem gần xong thì xoá khỏi continue
    if (progress >= FINISH_THRESHOLD) {
      const filtered = list.filter((m) => m._id !== movie._id);
      localStorage.setItem(KEY, JSON.stringify(filtered));

      // trigger update UI
      window.dispatchEvent(new Event("continue-updated"));
      return;
    }

    const item = {
      _id: movie._id,
      slug: movie.slug,
      title: movie.title,
      poster: movie.poster,
      backdrop: movie.backdrop,
      duration: safeDuration,
      currentTime,
      progress: Math.round(progress * 100), // %
      updatedAt: new Date().toISOString(),
    };

    const updated = [
      item,
      ...list.filter((m) => m._id !== movie._id),
    ].slice(0, MAX_ITEMS);

    localStorage.setItem(KEY, JSON.stringify(updated));

    // 👉 trigger để UI update realtime
    window.dispatchEvent(new Event("continue-updated"));
  } catch (err) {
    console.error("saveContinue error:", err);
  }
}

// 👉 Lấy danh sách
export function getContinue() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

// 👉 Xoá 1 item
export function removeContinue(id) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    const updated = list.filter((m) => m._id !== id);
    localStorage.setItem(KEY, JSON.stringify(updated));

    window.dispatchEvent(new Event("continue-updated"));
  } catch (err) {
    console.error("removeContinue error:", err);
  }
}

// 👉 Clear toàn bộ
export function clearContinue() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("continue-updated"));
}