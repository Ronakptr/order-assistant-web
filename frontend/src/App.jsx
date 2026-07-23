import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { LangProvider } from "./context/LangContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";

import MainLayout from "./components/layout/MainLayout";

import Dashboard from "./pages/Dashboard/index.jsx";
import Orders from "./pages/Orders/index.jsx";
import NewOrder from "./pages/Orders/NewOrder.jsx";
import Products from "./pages/Products/index.jsx";
import Customers from "./pages/Customers/index.jsx";
import Users from "./pages/Users/index.jsx";
import Messages from "./pages/Messages/index.jsx";
import Settings from "./pages/Settings/index.jsx";

import AppDateGlobalSync from "./components/common/AppDateGlobalSync.jsx";
import { initializeDateSettings } from "./utils/appDate";

import "./styles/variables.css";
import "./App.css";
import "./i18n";

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppDateInitializer({ children }) {
  useEffect(() => {
    initializeDateSettings();

    const handleDateSettingsUpdate = () => {
      initializeDateSettings();
    };

    window.addEventListener(
      "order-assistant-date-settings-updated",
      handleDateSettingsUpdate
    );

    return () => {
      window.removeEventListener(
        "order-assistant-date-settings-updated",
        handleDateSettingsUpdate
      );
    };
  }, []);

  return children;
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LangProvider>
          <AuthProvider>
            <AppDateInitializer>
              <BrowserRouter>
                <AppDateGlobalSync />

                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />

                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <MainLayout />
                      </PrivateRoute>
                    }
                  >
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/new" element={<NewOrder />} />
                    <Route path="orders/edit/:orderId" element={<NewOrder />} />
                    <Route path="products" element={<Products />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="customers/new" element={<Customers />} />
                    <Route path="users" element={<Users />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AppDateInitializer>
          </AuthProvider>
        </LangProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
