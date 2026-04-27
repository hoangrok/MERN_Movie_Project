import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FaArrowRight,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPlay,
} from "react-icons/fa";
import { loginUser, resetAuthState } from "../store/Slice/auth-slice";
import "../assets/styles/Auth.scss";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isLoading, isError, message } = useSelector(
    (state) => state.auth
  );

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Đăng nhập - Dam17+1";
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', 'noindex, nofollow');
    return () => { robotsMeta.setAttribute('content', 'index, follow'); };
  }, []);

  useEffect(() => {
    if (user && user.token) {
      navigate("/");
    }

    return () => {
      dispatch(resetAuthState());
    };
  }, [user, navigate, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(
      loginUser({
        email: form.email.trim(),
        password: form.password,
      })
    );
  };

  return (
    <main className="authPage authPage--login">
      <section className="authShell" aria-label="Đăng nhập Clipdam18">
        <div className="authBrand">
          <Link to="/" className="authBrand__mark" aria-label="Về trang chủ">
            <span className="authBrand__play">
              <FaPlay />
            </span>
            <span>clipdam18.com</span>
          </Link>

          <div className="authBrand__copy">
            <p className="authBrand__eyebrow">Bộ sưu tập riêng của bạn</p>
            <h1>Đăng nhập để tiếp tục xem.</h1>
            <p>
              Lưu clip yêu thích, quay lại video đang xem và giữ trải nghiệm
              của bạn liền mạch hơn.
            </p>
          </div>
        </div>

        <div className="authPanel">
          <div className="authPanel__head">
            <p>Welcome back</p>
            <h2>Đăng nhập</h2>
          </div>

          {isError ? (
            <div className="authNotice authNotice--error" role="alert">
              {message || "Đăng nhập thất bại"}
            </div>
          ) : null}

          <form className="authForm" onSubmit={handleSubmit}>
            <label className="authField">
              <span>Email</span>
              <div className="authField__control">
                <FaEnvelope />
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="authField">
              <span>Mật khẩu</span>
              <div className="authField__control">
                <FaLock />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Nhập mật khẩu"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="authField__toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>

            <button className="authSubmit" type="submit" disabled={isLoading}>
              <span>{isLoading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
              <FaArrowRight />
            </button>
          </form>

          <p className="authSwitch">
            Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
