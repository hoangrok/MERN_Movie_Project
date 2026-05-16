import { useEffect, useState } from "react";
import "./PageLoader.css";

export default function PageLoader() {
  const [width, setWidth] = useState(10);

  useEffect(() => {
    const t1 = setTimeout(() => setWidth(40), 50);
    const t2 = setTimeout(() => setWidth(70), 300);
    const t3 = setTimeout(() => setWidth(90), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return <div className="page-loader-bar" style={{ width: `${width}%` }} />;
}
