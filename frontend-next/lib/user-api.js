import {
  getAuthToken,
  saveAuthUser,
  updateLikedMovies,
  clearAuthUser,
} from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://dam18-api.onrender.com/api";

async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function normalizeLikedMovies(data) {
  if (Array.isArray(data?.likedMovies)) return data.likedMovies;
  if (Array.isArray(data?.movies)) return data.movies;
  if (Array.isArray(data?.user?.likedMovies)) return data.user.likedMovies;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeAuthUser(data) {
  if (!data?.user) return null;

  return {
    ...data.user,
    token: data?.token || data?.user?.token || "",
  };
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ email, password }),
  });

  const data = await parseJson(res);

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Đăng nhập thất bại");
  }

  const authUser = normalizeAuthUser(data);
  if (authUser) {
    saveAuthUser(authUser);
  }

  return data;
}

export async function registerUser({ name, email, password }) {
  const res = await fetch(`${API_BASE}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ name, email, password }),
  });

  const data = await parseJson(res);

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Đăng ký thất bại");
  }

  const authUser = normalizeAuthUser(data);
  if (authUser) {
    saveAuthUser(authUser);
  }

  return data;
}

export async function fetchLikedMovies() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Bạn chưa đăng nhập");
  }

  const res = await fetch(`${API_BASE}/users/liked`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await parseJson(res);

  if (!res.ok) {
    if (res.status === 401) {
      clearAuthUser();
    }
    throw new Error(data?.message || "Không tải được My List");
  }

  const likedMovies = normalizeLikedMovies(data);
  updateLikedMovies(likedMovies);

  return likedMovies;
}

export async function addToLiked(movieId) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Bạn chưa đăng nhập");
  }

  const res = await fetch(`${API_BASE}/users/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: JSON.stringify({ movieId }),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    if (res.status === 401) {
      clearAuthUser();
    }
    throw new Error(data?.message || "Không thể thêm vào My List");
  }

  const likedMovies = normalizeLikedMovies(data);
  updateLikedMovies(likedMovies);

  return data;
}

export async function removeFromLiked(movieId) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Bạn chưa đăng nhập");
  }

  const res = await fetch(`${API_BASE}/users/remove`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: JSON.stringify({ movieId }),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    if (res.status === 401) {
      clearAuthUser();
    }
    throw new Error(data?.message || "Không thể xoá khỏi My List");
  }

  const likedMovies = normalizeLikedMovies(data);
  updateLikedMovies(likedMovies);

  return data;
}