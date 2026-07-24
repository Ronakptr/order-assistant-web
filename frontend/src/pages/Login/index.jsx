import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchCurrentUser, startLoginOtp, verifyLoginOtp } from "../../api/auth";
import "./Login.css";

const OTP_LENGTH = 6;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialUsername = useMemo(
    () => String(location.state?.username || "").trim(),
    [location.state?.username]
  );

  const [step, setStep] = useState("password");
  const [formData, setFormData] = useState({
    username: initialUsername,
    password: "",
    otpCode: "",
  });
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.successMessage || "");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "otpCode" ? value.replace(/\D/g, "").slice(0, OTP_LENGTH) : value,
    }));

    setError("");
    setNotice("");
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    const username = formData.username.trim();

    if (!username || !formData.password.trim()) {
      setError("نام کاربری و رمز عبور را وارد کنید.");
      return;
    }

    setLoading(true);

    try {
      const data = await startLoginOtp(username, formData.password);

      setChallenge(data);
      setFormData((previous) => ({
        ...previous,
        username,
        otpCode: "",
      }));
      setStep("otp");
      setNotice("");
      setError("");
    } catch (err) {
      setError(err.message || "نام کاربری یا رمز عبور اشتباه است.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(event) {
    event.preventDefault();

    if (!challenge?.challenge_id) {
      setStep("password");
      setError("ورود اولیه دوباره انجام شود.");
      return;
    }

    if (formData.otpCode.length !== OTP_LENGTH) {
      setError("کد تایید ۶ رقمی را وارد کنید.");
      return;
    }

    setLoading(true);

    try {
      await verifyLoginOtp(challenge.challenge_id, formData.otpCode);
      await fetchCurrentUser();

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "کد تایید اشتباه است.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    const username = formData.username.trim();

    if (!username || !formData.password.trim()) {
      setStep("password");
      return;
    }

    setLoading(true);

    try {
      const data = await startLoginOtp(username, formData.password);
      setChallenge(data);
      setFormData((previous) => ({ ...previous, otpCode: "" }));
      setError("");
      setNotice("کد جدید ساخته شد.");
    } catch (err) {
      setError(err.message || "ارسال مجدد کد انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  function goBackToPassword() {
    setStep("password");
    setChallenge(null);
    setFormData((previous) => ({ ...previous, otpCode: "" }));
    setError("");
    setNotice("");
  }

  function handleForgotPassword() {
    setNotice("بازیابی رمز عبور در مرحله بعد به ایمیل یا پیامک متصل می‌شود.");
    setError("");
  }

  return (
    <main className="auth-page auth-page--login" dir="rtl">
      <section className="auth-layout" aria-label="ورود به برنامه">
        <aside className="auth-hero" aria-hidden="true">
          <img src="/auth-order-preview.jpg" alt="" />
        </aside>

        <section className="auth-form-panel" aria-labelledby="login-title">
          <div className="auth-content">
            <h1 id="login-title">{step === "password" ? "ورود" : "کد تایید"}</h1>

            {notice ? <div className="auth-alert auth-alert--success">{notice}</div> : null}
            {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}

            {step === "password" ? (
              <form className="auth-form" onSubmit={handlePasswordSubmit}>
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
                      autoComplete="current-password"
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

                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? "در حال بررسی..." : "ورود"}
                </button>

                <div className="auth-links auth-links--stack">
                  <span>
                    حساب کاربری ندارید؟
                    <Link to="/register">ثبت نام</Link>
                  </span>

                  <button type="button" onClick={handleForgotPassword}>
                    فراموشی رمز عبور
                  </button>
                </div>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleOtpSubmit}>
                <label className="auth-field">
                  <span>کد تایید</span>
                  <input
                    className="auth-otp-input"
                    type="text"
                    inputMode="numeric"
                    name="otpCode"
                    value={formData.otpCode}
                    onChange={handleChange}
                    autoComplete="one-time-code"
                    disabled={loading}
                    placeholder="------"
                    maxLength={OTP_LENGTH}
                  />
                </label>

                {challenge?.debug_otp ? (
                  <div className="auth-test-code">
                    کد تست: <strong>{challenge.debug_otp}</strong>
                  </div>
                ) : null}

                <button className="auth-submit" type="submit" disabled={loading}>
                  {loading ? "در حال تایید..." : "ورود"}
                </button>

                <div className="auth-actions">
                  <button type="button" onClick={resendOtp} disabled={loading}>
                    ارسال مجدد
                  </button>
                  <button type="button" onClick={goBackToPassword} disabled={loading}>
                    برگشت
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
