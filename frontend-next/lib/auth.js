const AUTH_KEY = "dam18_user";

export function saveAuthUser(user) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user || null));
  window.dispatchEvent(new Event("auth-updated"));
}

export function getAuthUser() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export function getAuthToken() {
  const user = getAuthUser();
  return user?.token || "";
}

export function isLoggedIn() {
  return !!getAuthToken();
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event("auth-updated"));
}

export function updateLikedMovies(likedMovies = []) {
  const user = getAuthUser();
  if (!user) return;

  const updatedUser = {
    ...user,
    likedMovies,
  };

  saveAuthUser(updatedUser);
}