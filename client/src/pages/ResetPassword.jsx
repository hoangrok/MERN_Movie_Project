import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowRight, FaEye, FaEyeSlash, FaLock, FaPlay } from "react-icons/fa";
import { resetPassword } from "../services/authService";
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

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ next: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Đặt lại mật khẩu - Dam17+1";
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute("content", "noindex, nofollow");
    return () => { robotsMeta.setAttribute("content", "index, follow"); };
  }, []);

  const strength = getStrength(form.newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }

    setIsLoading(true);
    const res = await resetPassword({ token, newPassword: form.newPassword });
    setIsLoading(false);

    if (res?.success) {
      setTimeout(() => navigate("/login"), 1500);
    } else {
      setError(res?.message || "Có lỗi xảy ra");
    }
  };

  return (
    <main className="authPage authPage--login">
      <section className="authShell" aria-label="Đặt lại mật khẩu">
        <div className="authBrand">
          <Link to="/" className="authBrand__mark" aria-label="Về trang chủ">
            <span className="authBrand__play"><FaPlay /></span>
            <span>clipdam18.com</span>
          </Link>
          <div className="authBrand__copy">
            <p className="authBrand__eyebrow">Khôi phục tài khoản</p>
            <h1>Đặt mật khẩu mới.</h1>
            <p>Chọn mật khẩu mạnh để bảo vệ tài khoản của bạn.</p>
          </div>
        </div>

        <div className="authPanel">
          <div className="authPanel__head">
            <p>Bảo mật tài khoản</p>
            <h2>Đặt lại mật khẩu</h2>
          </div>

          {error && (
            <div className="authNotice authNotice--error" role="alert">{error}</div>
          )}

          <form className="authForm" onSubmit={handleSubmit}>
            <label className="authField">
              <span>Mật khẩu mới</span>
              <div className="authField__control">
                <FaLock />
                <input
                  type={show.next ? "text" : "password"}
                  placeholder="Ít nhất 6 ký tự"
                  value={form.newPassword}
                  onChange={(e) => { setError(""); setForm((f) => ({ ...f, newPassword: e.target.value })); }}
                  autoComplete="new-password"
                  required
                />
                <button type="button" className="authField__toggle"
                  onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
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
                  placeholder="Nhập lại mật khẩu mới"
                  value={form.confirmPassword}
                  onChange={(e) => { setError(""); setForm((f) => ({ ...f, confirmPassword: e.target.value })); }}
                  autoComplete="new-password"
                  required
                />
                <button type="button" className="authField__toggle"
                  onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                >
                  {show.confirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>

            <button className="authSubmit" type="submit" disabled={isLoading}>
              <span>{isLoading ? "Đang lưu..." : "Đặt lại mật khẩu"}</span>
              <FaArrowRight />
            </button>
          </form>

          <p className="authSwitch">
            <Link to="/login">Về trang đăng nhập</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
