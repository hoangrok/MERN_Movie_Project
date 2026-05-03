import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaArrowRight, FaEye, FaEyeSlash, FaLock, FaPlay } from "react-icons/fa";
import { changePassword } from "../services/authService";
import "../assets/styles/Auth.scss";

const getStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const strengthLabel = ["Quá yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"];

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = "Đổi mật khẩu - Dam17+1";
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute("content", "noindex, nofollow");
    return () => { robotsMeta.setAttribute("content", "index, follow"); };
  }, []);

  useEffect(() => {
    if (!user?.token) navigate("/login", { replace: true });
  }, [user, navigate]);

  const strength = getStrength(form.newPassword);

  const handleChange = (e) => {
    setError("");
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("Mật khẩu mới phải ít nhất 6 ký tự");
      return;
    }

    setIsLoading(true);
    const res = await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
      token: user.token,
    });
    setIsLoading(false);

    if (res?.success) {
      setSuccess(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setError(res?.message || "Đổi mật khẩu thất bại");
    }
  };

  return (
    <main className="authPage authPage--login">
      <section className="authShell" aria-label="Đổi mật khẩu">
        <div className="authBrand">
          <Link to="/" className="authBrand__mark" aria-label="Về trang chủ">
            <span className="authBrand__play"><FaPlay /></span>
            <span>clipdam18.com</span>
          </Link>
          <div className="authBrand__copy">
            <p className="authBrand__eyebrow">Bảo mật tài khoản</p>
            <h1>Giữ tài khoản của bạn an toàn.</h1>
            <p>Đổi mật khẩu định kỳ giúp bảo vệ tài khoản và danh sách phim yêu thích của bạn.</p>
          </div>
        </div>

        <div className="authPanel">
          <div className="authPanel__head">
            <p>Tài khoản của bạn</p>
            <h2>Đổi mật khẩu</h2>
          </div>

          {error && (
            <div className="authNotice authNotice--error" role="alert">{error}</div>
          )}
          {success && (
            <div className="authNotice authNotice--success" role="status">
              Đổi mật khẩu thành công! <Link to="/" style={{ color: "inherit", fontWeight: 800 }}>Về trang chủ</Link>
            </div>
          )}

          <form className="authForm" onSubmit={handleSubmit}>
            <label className="authField">
              <span>Mật khẩu hiện tại</span>
              <div className="authField__control">
                <FaLock />
                <input
                  type={show.current ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Nhập mật khẩu hiện tại"
                  value={form.currentPassword}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="authField__toggle"
                  onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
                  aria-label={show.current ? "Ẩn" : "Hiện"}
                >
                  {show.current ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>

            <label className="authField">
              <span>Mật khẩu mới</span>
              <div className="authField__control">
                <FaLock />
                <input
                  type={show.next ? "text" : "password"}
                  name="newPassword"
                  placeholder="Ít nhất 6 ký tự"
                  value={form.newPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <button type="button" className="authField__toggle"
                  onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
                  aria-label={show.next ? "Ẩn" : "Hiện"}
                >
                  {show.next ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>

            {form.newPassword.length > 0 && (
              <div className="authStrength" data-score={strength}>
                <div className="authStrength__track"><span /></div>
                <p>{strengthLabel[strength]}</p>
              </div>
            )}

            <label className="authField">
              <span>Xác nhận mật khẩu mới</span>
              <div className="authField__control">
                <FaLock />
                <input
                  type={show.confirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Nhập lại mật khẩu mới"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />
                <button type="button" className="authField__toggle"
                  onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                  aria-label={show.confirm ? "Ẩn" : "Hiện"}
                >
                  {show.confirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>

            <button className="authSubmit" type="submit" disabled={isLoading}>
              <span>{isLoading ? "Đang lưu..." : "Lưu mật khẩu mới"}</span>
              <FaArrowRight />
            </button>
          </form>

          <p className="authSwitch">
            <Link to="/">Quay về trang chủ</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
