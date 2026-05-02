import { useEffect, useRef } from "react";

export default function ExoBanner({ zoneId = "5915992", className = "eas6a97888e2" }) {
  const served = useRef(false);

  useEffect(() => {
    if (served.current) return;
    served.current = true;
    window.AdProvider = window.AdProvider || [];
    window.AdProvider.push({ serve: {} });
  }, []);

  return <ins className={className} data-zoneid={zoneId} />;
}
