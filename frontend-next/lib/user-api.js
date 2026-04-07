import { getAuthToken, saveAuthUser, updateLikedMovies } from "@/lib/auth";

const API_BASE = "https://dam18-api.onrender.com/api";

export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Đăng nhập thất bại");
  }

  if (data?.user) {
    saveAuthUser(data.user);
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

  const data = await res.json();

  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "Đăng ký thất bại");
  }

  if (data?.user) {
    saveAuthUser(data.user);
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Không tải được My List");
  }

  const likedMovies = data?.likedMovies || data?.movies || data || [];
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Không thể thêm vào My List");
  }

  const likedMovies = data?.likedMovies || data?.user?.likedMovies || [];
  if (likedMovies.length) updateLikedMovies(likedMovies);

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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Không thể xoá khỏi My List");
  }

  const likedMovies = data?.likedMovies || data?.user?.likedMovies || [];
  updateLikedMovies(likedMovies);

  return data;
}