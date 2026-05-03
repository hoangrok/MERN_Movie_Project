import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FaArrowRight, FaCamera, FaPlay, FaUser } from "react-icons/fa";
import axios from "axios";
import { updateProfile } from "../services/authService";
import { updateUserName, updateUserAvatar } from "../store/Slice/auth-slice";
import { API_URL } from "../utils/api";
import "../assets/styles/Auth.scss";
import "./Profile.scss";

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const fileRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    document.title = "Hồ sơ - Dam17+1";
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute("content", "noindex, nofollow");
    return () => { robotsMeta.setAttribute("content", "index, follow"); };
  }, []);

  if (!user) {
    return (
      <main className="authPage authPage--login">
        <p style={{ color: "#111" }}>Vui lòng <Link to="/login">đăng nhập</Link> để xem hồ sơ.</p>
      </main>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const { data } = await axios.post(`${API_URL}/users/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      if (data.success) {
        dispatch(updateUserAvatar(data.avatar));
        setAvatarFile(null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Upload ảnh thất bại");
    }
    setUploadingAvatar(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!name.trim()) { setError("Tên không được để trống"); return; }

    setIsLoading(true);
    const res = await updateProfile({ name: name.trim(), token: user.token });
    setIsLoading(false);

    if (res?.success) {
      dispatch(updateUserName(name.trim()));
      setSuccess(true);
    } else {
      setError(res?.message || "Có lỗi xảy ra");
    }
  };

  const initials = (user.name || "?")[0].toUpperCase();
  const colors = ["#e50914","#0070f3","#7c3aed","#059669","#d97706","#db2777"];
  const bgColor = colors[initials.charCodeAt(0) % colors.length];

  return (
    <main className="authPage authPage--login">
      <section className="authShell" aria-label="Hồ sơ cá nhân">
        <div className="authBrand">
          <Link to="/" className="authBrand__mark" aria-label="Về trang chủ">
            <span className="authBrand__play"><FaPlay /></span>
            <span>clipdam18.com</span>
          </Link>
          <div className="authBrand__copy">
            <p className="authBrand__eyebrow">Tài khoản của bạn</p>
            <h1>Cá nhân hoá trải nghiệm của bạn.</h1>
            <p>Cập nhật ảnh đại diện và tên hiển thị cho tài khoản.</p>
          </div>
        </div>

        <div className="authPanel">
          <div className="authPanel__head">
            <p>{user.email}</p>
            <h2>Hồ sơ cá nhân</h2>
          </div>

          {error && <div className="authNotice authNotice--error">{error}</div>}
          {success && <div className="authNotice authNotice--success">Đã cập nhật tên thành công!</div>}

          {/* Avatar */}
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" />
              ) : (
                <span style={{ background: bgColor }}>{initials}</span>
              )}
              <button
                type="button"
                className="profile-avatar__edit"
                onClick={() => fileRef.current?.click()}
                aria-label="Đổi ảnh đại diện"
              >
                <FaCamera />
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {avatarFile && (
              <button
                type="button"
                className="profile-avatar__save"
                onClick={handleAvatarUpload}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "Đang tải..." : "Lưu ảnh"}
              </button>
            )}
          </div>

          {/* Name form */}
          <form className="authForm" onSubmit={handleSubmit}>
            <label className="authField">
              <span>Tên hiển thị</span>
              <div className="authField__control">
                <FaUser />
                <input
                  type="text"
                  placeholder="Tên của bạn"
                  value={name}
                  onChange={(e) => { setError(""); setSuccess(false); setName(e.target.value); }}
                  autoComplete="name"
                  required
                />
              </div>
            </label>

            <button
              className="authSubmit"
              type="submit"
              disabled={isLoading || name.trim() === user.name}
            >
              <span>{isLoading ? "Đang lưu..." : "Lưu thay đổi"}</span>
              <FaArrowRight />
            </button>
          </form>

          <p className="authSwitch" style={{ marginTop: 12 }}>
            <Link to="/change-password">Đổi mật khẩu</Link>
            {" · "}
            <Link to="/">Về trang chủ</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
