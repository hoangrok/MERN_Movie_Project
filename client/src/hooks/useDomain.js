const MOBILE_HOST = "m.clipdam18.com";
const WWW_HOST = "www.clipdam18.com";
const PREFER_DESKTOP_KEY = "prefer_desktop";

export function isMobileSite() {
  return typeof window !== "undefined" && window.location.hostname === MOBILE_HOST;
}

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
  const isSmallScreen = window.innerWidth <= 768;
  return isMobileUA || isSmallScreen;
}

export function runMobileRedirect() {
  if (typeof window === "undefined") return;

  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (isLocal) return;

  const preferDesktop = localStorage.getItem(PREFER_DESKTOP_KEY) === "1";
  const onMobileSite = host === MOBILE_HOST;
  const onMainSite = host === WWW_HOST || host === "clipdam18.com";

  if (onMainSite && !preferDesktop && isMobileDevice()) {
    const dest = `https://${MOBILE_HOST}${window.location.pathname}${window.location.search}`;
    window.location.replace(dest);
  }
}

export function setPreferDesktop(value) {
  if (value) {
    localStorage.setItem(PREFER_DESKTOP_KEY, "1");
  } else {
    localStorage.removeItem(PREFER_DESKTOP_KEY);
  }
}

export default function useDomain() {
  return { isMobileSite: isMobileSite() };
}
