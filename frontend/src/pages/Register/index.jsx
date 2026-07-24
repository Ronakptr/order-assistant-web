import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../api/auth";
import "../Login/Login.css";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const username = formData.username.trim();
    const email = formData.email.trim();

    if (username.length < 3) {
      setError("نام کاربری باید حداقل ۳ کاراکتر باشد.");
      return;
    }

    if (formData.password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        fullName: username,
        username,
        email,
        password: formData.password,
      });

      const successMessage = "ثبت‌نام انجام شد.";

      setNotice(successMessage);

      setTimeout(() => {
        navigate("/login", {
          state: {
            username,
            successMessage,
          },
        });
      }, 550);
    } catch (err) {
      setError(err.message || "خطا در ثبت‌نام");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-page--register" dir="rtl">
      <section className="auth-layout" aria-label="ثبت نام در برنامه">
        <aside className="auth-hero" aria-hidden="true">
          <img src="/auth-order-preview.jpg" alt="" />
        </aside>

        <section className="auth-form-panel" aria-labelledby="register-title">
          <div className="auth-content">
            <h1 id="register-title">ثبت نام</h1>

            {notice ? <div className="auth-alert auth-alert--success">{notice}</div> : null}
            {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>نام کاربری</span>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                  disabled={loading}
                />
              </label>

              <label className="auth-field">
                <span>رمز عبور</span>
                <div className="auth-password-wrap">
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <span className="auth-eye" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="m3 3 18 18" />
                      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                      <path d="M9.88 5.1A10.7 10.7 0 0 1 12 4.9c5 0 8.2 4.1 9 5.3a2 2 0 0 1 0 2.2 14.7 14.7 0 0 1-2.44 2.88" />
                      <path d="M6.1 6.7A14.4 14.4 0 0 0 3 10.2a2 2 0 0 0 0 2.2c.8 1.2 4 5.3 9 5.3 1.08 0 2.08-.2 3-.55" />
                    </svg>
                  </span>
                </div>
              </label>

              <label className="auth-field">
                <span>تکرار رمز عبور</span>
                <div className="auth-password-wrap">
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <span className="auth-eye" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="m3 3 18 18" />
                      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                      <path d="M9.88 5.1A10.7 10.7 0 0 1 12 4.9c5 0 8.2 4.1 9 5.3a2 2 0 0 1 0 2.2 14.7 14.7 0 0 1-2.44 2.88" />
                      <path d="M6.1 6.7A14.4 14.4 0 0 0 3 10.2a2 2 0 0 0 0 2.2c.8 1.2 4 5.3 9 5.3 1.08 0 2.08-.2 3-.55" />
                    </svg>
                  </span>
                </div>
              </label>

              <label className="auth-field">
                <span>ایمیل</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={loading}
                />
              </label>

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "در حال ساخت..." : "ثبت نام"}
              </button>

              <div className="auth-links">
                <span>
                  ثبت نام کردید؟
                  <Link to="/login">ورود</Link>
                </span>
              </div>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
