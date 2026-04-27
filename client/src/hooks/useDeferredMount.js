import { useEffect, useState } from "react";

export default function useDeferredMount({
  enabled = true,
  delay = 1200,
} = {}) {
  const [mounted, setMounted] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setMounted(true);
      return undefined;
    }

    setMounted(false);

    if (typeof window === "undefined") {
      setMounted(true);
      return undefined;
    }

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(
        () => {
          setMounted(true);
        },
        { timeout: delay }
      );

      return () => {
        if ("cancelIdleCallback" in window) {
          window.cancelIdleCallback(idleId);
        }
      };
    }

    const timerId = window.setTimeout(() => {
      setMounted(true);
    }, delay);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [delay, enabled]);

  return mounted;
}
