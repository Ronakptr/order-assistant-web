import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCurrentUser, loginUser } from "../../api/auth";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.username.trim() || !formData.password.trim()) {
      alert("نام کاربری و رمز عبور را وارد کنید");
      return;
    }

    setLoading(true);

    try {
      await loginUser(formData.username.trim(), formData.password);
      await fetchCurrentUser();

      navigate("/dashboard", { replace: true });
    } catch (error) {
      alert(error.message || "نام کاربری یا رمز عبور اشتباه است");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo">OA</div>
          <div>
            <h1>ورود</h1>
            <p>به حساب کاربری خود وارد شوید</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            نام کاربری
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label>
            رمز عبور
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "در حال ورود..." : "ورود"}
          </button>
        </form>

        <div className="login-footer">
          حساب ندارید؟
          <Link to="/register"> ثبت‌نام کنید</Link>
        </div>
      </section>
    </main>
  );
}