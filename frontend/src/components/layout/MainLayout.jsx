import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./MainLayout.css";

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function MainLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("oa-mobile-sidebar-open", sidebarOpen);

    return () => document.body.classList.remove("oa-mobile-sidebar-open");
  }, [sidebarOpen]);

  return (
    <div className={`main-layout ${sidebarOpen ? "main-layout--sidebar-open" : ""}`}>
      <button
        type="button"
        className="main-layout__mobile-menu"
        onClick={() => setSidebarOpen(true)}
        aria-label="باز کردن منو"
      >
        <MenuIcon />
      </button>

      <div
        className="main-layout__sidebar-backdrop"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className="main-layout__sidebar-shell">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </aside>

      <main className="main-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
