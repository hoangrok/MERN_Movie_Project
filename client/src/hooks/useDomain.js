const MOBILE_HOST = "m.clipdam18.com";

export function isMobileSite() {
  return typeof window !== "undefined" && window.location.hostname === MOBILE_HOST;
}

export default function useDomain() {
  return { isMobileSite: isMobileSite() };
}
