import React, { useEffect } from "react";
import "./NotFound.scss";
import { useNavigate } from "react-router-dom";
import { BiArrowBack } from "react-icons/bi";
import { setSEO } from "../../utils/seo";

const DEFAULT_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setSEO({
      title: "Không tìm thấy trang - Dam17+1",
      description: "Trang bạn tìm không tồn tại hoặc đã bị gỡ.",
      url: "https://www.clipdam18.com/404",
      robots: "noindex, nofollow",
    });

    return () => {
      setSEO({
        robots: DEFAULT_ROBOTS,
      });
    };
  }, []);

  return (
    <div className="notFound">
      <h1 className="notFound__title">404</h1>
      <h2 style={{ color: "#fff", marginBottom: 8 }}>Lạc đường rồi!</h2>
      <p className="notFound__text">
        Trang này không tồn tại hoặc đã bị gỡ.
      </p>
      <button
        className="notFound__link"
        onClick={() => navigate("/", { replace: true })}
      >
        <BiArrowBack />
        Về trang chủ
      </button>
    </div>
  );
};

export default NotFound;
