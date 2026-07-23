import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";
import {
  clearAuthSession,
  fetchCurrentUser,
  getRoleLabel,
  getStoredUser,
  isAdminRole,
} from "../../../api/auth";
import "./Sidebar.css";

import orderAssistantLogo from "../../../assets/order-assistant-logo.png";
import orderAssistantLogoDark from "../../../assets/order-assistant-logo-dark.png";

const navItems = [
  {
    label: "داشبورد",
    to: "/dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    label: "مدیریت سفارش ها",
    to: "/orders",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 3h10l2 3v15H5V6l2-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M7 6h10" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9 11h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9 15h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "مدیریت محصولات",
    to: "/products",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M4 7.5 12 12l8-4.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 12v9" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: "مدیریت مشتریان",
    to: "/customers",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="9"
          cy="10"
          r="2.2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M6.8 16.2c.55-1.7 1.55-2.55 2.95-2.55s2.4.85 2.95 2.55"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14.5 9h2.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14.5 13h2.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "مدیریت کاربران",
    to: "/users",
    adminOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="9.5" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M21 21v-2a4 4 0 0 0-3-3.87"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "مدیریت پیام ها",
    to: "/messages",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 5h16v12H7l-3 3V5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 9h8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 13h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "تنظیمات",
    to: "/settings",
    adminOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2.06 2.06 0 0 1-2.91 2.91l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.05V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2.06 2.06 0 0 1-2.91-2.91l.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.05-.4H2.5a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.2 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2.06 2.06 0 0 1 2.91-2.91l.06.06A1.7 1.7 0 0 0 8.6 4.2a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 10 2.55V2.5a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2.06 2.06 0 0 1 2.91 2.91l-.06.06A1.7 1.7 0 0 0 19.4 8.6a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.05.4h.05a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

function SidebarLogo() {
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? orderAssistantLogoDark : orderAssistantLogo;

  return (
    <div className="sidebar-logo" aria-label="Order Assistant Logo">
      <img
        src={logoSrc}
        alt="Order Assistant"
        className="sidebar-logo__image"
      />
    </div>
  );
}

export default function Sidebar({ isOpen = false, onClose }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  useEffect(() => {
    let alive = true;

    async function loadUser() {
      const user = await fetchCurrentUser();

      if (alive && user) {
        setCurrentUser(user);
      }
    }

    loadUser();

    function handleAuthChange(event) {
      setCurrentUser(event.detail || getStoredUser());
    }

    window.addEventListener("oa-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      alive = false;
      window.removeEventListener("oa-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => !item.adminOnly || isAdminRole(currentUser?.role));
  }, [currentUser?.role]);

  const displayName =
    currentUser?.full_name ||
    currentUser?.name ||
    currentUser?.username ||
    "کاربر";

  const userRole = getRoleLabel(currentUser?.role);

  function handleLogout() {
    clearAuthSession();
    onClose?.();
    navigate("/login", { replace: true });
  }

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <button
        type="button"
        className="sidebar__mobile-close"
        onClick={onClose}
        aria-label="بستن منو"
      >
        ×
      </button>

      <div className="sidebar__top">
        <SidebarLogo />

        <div className="sidebar__section-label">منو</div>

        <nav className="sidebar__nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar__item${isActive ? " active" : ""}`
              }
            >
              <span className="sidebar__item-icon">{item.icon}</span>
              <span className="sidebar__item-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar__footer">
        <div className="user-box">
          <div className="user-box__username">{displayName}</div>

          <div className="user-box__role">
            <span>نقش کاربر:</span>
            <strong>{userRole}</strong>
          </div>

          <button
            type="button"
            className="user-box__logout"
            onClick={handleLogout}
          >
            خروج از حساب
          </button>
        </div>
      </div>
    </aside>
  );
}