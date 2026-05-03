import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaEnvelope, FaPlay } from "react-icons/fa";
import { forgotPassword } from "../services/authService";
import "../assets/styles/Auth.scss";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Quên mật khẩu - Dam17+1";
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute("content", "noindex, nofollow");
    return () => { robotsMeta.setAttribute("content", "index, follow"); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await forgotPassword(email.trim());
    setIsLoading(false);
    if (res?.success) setSent(true);
  };

  return (
    <main className="authPage authPage--login">
      <section className="authShell" aria-label="Quên mật khẩu">
        <div className="authBrand">
          <Link to="/" className="authBrand__mark" aria-label="Về trang chủ">
            <span className="authBrand__play"><FaPlay /></span>
            <span>clipdam18.com</span>
          </Link>
          <div className="authBrand__copy">
            <p className="authBrand__eyebrow">Khôi phục tài khoản</p>
            <h1>Đừng lo, chúng tôi sẽ giúp bạn.</h1>
            <p>Nhập email đã đăng ký và chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.</p>
          </div>
        </div>

        <div className="authPanel">
          <div className="authPanel__head">
            <p>Bảo mật tài khoản</p>
            <h2>Quên mật khẩu</h2>
          </div>

          {sent ? (
            <div className="authNotice authNotice--success">
              Kiểm tra hộp thư của bạn — nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.
            </div>
          ) : (
            <form className="authForm" onSubmit={handleSubmit}>
              <label className="authField">
                <span>Email đã đăng ký</span>
                <div className="authField__control">
                  <FaEnvelope />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <button className="authSubmit" type="submit" disabled={isLoading}>
                <span>{isLoading ? "Đang gửi..." : "Gửi link đặt lại"}</span>
                <FaArrowRight />
              </button>
            </form>
          )}

          <p className="authSwitch">
            Nhớ ra rồi? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
