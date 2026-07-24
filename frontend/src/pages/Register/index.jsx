import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../api/auth";
import "../Login/Login.css";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const fullName = formData.fullName.trim();
    const username = formData.username.trim();
    const email = formData.email.trim();

    if (fullName.length < 2) {
      setError("نام مدیر یا شرکت را وارد کنید.");
      return;
    }

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
        fullName,
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
      <section className="auth-card auth-card--register" aria-labelledby="register-title">
        <div className="auth-header">
          <span className="auth-kicker">ثبت‌نام</span>
          <h1 id="register-title">ساخت حساب</h1>
        </div>

        {notice ? <div className="auth-alert auth-alert--success">{notice}</div> : null}
        {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}

        <form className="auth-form auth-form--register" onSubmit={handleSubmit}>
          <label className="auth-field auth-field--full">
            <span>نام مدیر یا شرکت</span>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              autoComplete="name"
              disabled={loading}
              placeholder="نام مدیر یا شرکت"
            />
          </label>

          <label className="auth-field">
            <span>نام کاربری</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              disabled={loading}
              placeholder="نام کاربری"
            />
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
              placeholder="ایمیل"
            />
          </label>

          <label className="auth-field">
            <span>رمز عبور</span>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={loading}
              placeholder="رمز عبور"
            />
          </label>

          <label className="auth-field">
            <span>تکرار رمز عبور</span>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={loading}
              placeholder="تکرار رمز عبور"
            />
          </label>

          <button className="auth-submit auth-submit--full" type="submit" disabled={loading}>
            {loading ? "در حال ساخت..." : "ثبت‌نام"}
          </button>
        </form>

        <div className="auth-footer">
          حساب دارید؟
          <Link to="/login">وارد شوید</Link>
        </div>
      </section>
    </main>
  );
}
