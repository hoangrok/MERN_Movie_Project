import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPlay,
  FaUser,
} from "react-icons/fa";
import { register } from "../services/authService";
import "../assets/styles/Auth.scss";

export default function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Đăng ký - Dam17+1";
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', 'noindex, nofollow');
    return () => { robotsMeta.setAttribute('content', 'index, follow'); };
  }, []);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (form.password.length >= 6) score += 1;
    if (/[A-Z]/.test(form.password)) score += 1;
    if (/\d/.test(form.password)) score += 1;
    if (/[^A-Za-z0-9]/.test(form.password)) score += 1;
    return score;
  }, [form.password]);

  const passwordLabel = ["Quá ngắn", "Tạm ổn", "Khá ổn", "Tốt", "Rất tốt"][
    passwordScore
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errorMsg) setErrorMsg("");
    if (successMsg) setSuccessMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMsg("");
    setSuccessMsg("");

    if (!form.name.trim()) {
      setErrorMsg("Vui lòng nhập tên hiển thị");
      return;
    }

    if (!form.email.trim()) {
      setErrorMsg("Vui lòng nhập email");
      return;
    }

    if (!form.password) {
      setErrorMsg("Vui lòng nhập mật khẩu");
      return;
    }

    if (form.password.length < 6) {
      setErrorMsg("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);

      const res = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      if (res?.success) {
        setSuccessMsg(res.message || "Đăng ký thành công");

        setForm({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });

        setTimeout(() => {
          navigate("/login");
        }, 900);
      } else {
        setErrorMsg(res?.message || "Đăng ký thất bại");
      }
    } catch (error) {
      console.log(error);
      setErrorMsg("Có lỗi xảy ra khi đăng ký");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="authPage authPage--register">
      <section className="authShell" aria-label="Đăng ký Clipdam18">
        <div className="authBrand">
          <Link to="/" className="authBrand__mark" aria-label="Về trang chủ">
            <span className="authBrand__play">
              <FaPlay />
            </span>
            <span>clipdam18.com</span>
          </Link>

          <div className="authBrand__copy">
            <p className="authBrand__eyebrow">Tài khoản cá nhân</p>
            <h1>Tạo không gian xem của riêng bạn.</h1>
            <p>
              Thêm video vào bộ sưu tập, giữ lịch sử đang xem và đồng bộ trải
              nghiệm trên nhiều thiết bị.
            </p>
          </div>
        </div>

        <div className="authPanel">
          <div className="authPanel__head">
            <p>Start watching</p>
            <h2>Tạo tài khoản</h2>
          </div>

          {errorMsg ? (
            <div className="authNotice authNotice--error" role="alert">
              {errorMsg}
            </div>
          ) : null}
          {successMsg ? (
            <div className="authNotice authNotice--success" role="status">
              {successMsg}
            </div>
          ) : null}

          <form className="authForm" onSubmit={handleSubmit}>
            <label className="authField">
              <span>Tên hiển thị</span>
              <div className="authField__control">
                <FaUser />
                <input
                  type="text"
                  name="name"
                  placeholder="Tên của bạn"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>
            </label>

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
                  placeholder="Tối thiểu 6 ký tự"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
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

            <div className="authStrength" data-score={passwordScore}>
              <div className="authStrength__track">
                <span />
              </div>
              <p>{passwordLabel}</p>
            </div>

            <label className="authField">
              <span>Xác nhận mật khẩu</span>
              <div className="authField__control">
                <FaLock />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="authField__toggle"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={
                    showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                  }
                  title={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </label>

            <button className="authSubmit" type="submit" disabled={loading}>
              <span>{loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}</span>
              <FaArrowRight />
            </button>
          </form>

          <p className="authSwitch">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
