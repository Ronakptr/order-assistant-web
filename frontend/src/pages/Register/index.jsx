import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import '../Login/Login.css';

function Register() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (formData.password !== formData.confirmPassword) {
        setError(t('auth.password_mismatch'));
      } else {
        navigate('/login');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img
          src={theme === 'dark' ? '/login-dark.jpg' : '/login-light.jpg'}
          alt="register"
          className="login-illustration"
        />
      </div>

      <div className="login-right">
        <div className="login-form-wrapper">
          <h1 className="login-title">{t('auth.register_title')}</h1>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">{t('auth.username')}</label>
              <input
                type="text"
                name="username"
                className="form-input"
                placeholder={t('auth.username_placeholder')}
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.password')}</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder={t('auth.password_placeholder')}
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.confirm_password')}</label>
              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className="form-input"
                  placeholder={t('auth.confirm_password_placeholder')}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.email')}</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder={t('auth.email_placeholder')}
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? t('common.loading') : t('auth.register_btn')}
            </button>
          </form>

          <div className="login-links">
            <span className="link-text">{t('auth.have_account')}</span>
            <Link to="/login" className="link-btn">{t('auth.login')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;