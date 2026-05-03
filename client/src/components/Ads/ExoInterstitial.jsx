import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function ExoInterstitial({ zoneId = "5916254", className = "eas6a97888e31" }) {
  const served = useRef(false);
  const location = useLocation();

  useEffect(() => {
    served.current = false;
  }, [location.pathname]);

  useEffect(() => {
    if (served.current) return;
    served.current = true;
    window.AdProvider = window.AdProvider || [];
    window.AdProvider.push({ serve: {} });
  }, [location.pathname]);

  return <ins className={className} data-zoneid={zoneId} />;
}
