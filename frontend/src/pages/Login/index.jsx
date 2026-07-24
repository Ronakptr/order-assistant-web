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

    setFormData((prev) => ({
      ...prev,
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
      setFormData((prev) => ({
        ...prev,
        username,
        otpCode: "",
      }));
      setStep("otp");
      setNotice("");
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
      setFormData((prev) => ({ ...prev, otpCode: "" }));
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
    setFormData((prev) => ({ ...prev, otpCode: "" }));
    setError("");
    setNotice("");
  }

  return (
    <main className="auth-page auth-page--login" dir="rtl">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-header">
          <span className="auth-kicker">
            {step === "password" ? "ورود" : "تایید ورود"}
          </span>
          <h1 id="login-title">
            {step === "password" ? "خوش آمدید" : "کد تایید"}
          </h1>
        </div>

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
                placeholder="نام کاربری"
              />
            </label>

            <label className="auth-field">
              <span>رمز عبور</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={loading}
                placeholder="رمز عبور"
              />
            </label>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "در حال بررسی..." : "ادامه"}
            </button>
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

        <div className="auth-footer">
          حساب ندارید؟
          <Link to="/register">ثبت‌نام کنید</Link>
        </div>
      </section>
    </main>
  );
}
