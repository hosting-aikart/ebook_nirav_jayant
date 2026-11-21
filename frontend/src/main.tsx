import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AccountPage from "./pages/Account";
import Bookshelf from "./pages/Bookshelf";
import "./index.css";

// The admin panel is loaded only on /admin, so customers never download it.
const AdminApp = lazy(() => import("./admin/AdminApp"));
const path = window.location.pathname.replace(/\/+$/, "");
const isAdminRoute = path.startsWith("/admin");
const isBookshelf = path === "/bookshelf";
const isAccount = path === "/account" || path === "/account/reset";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isAdminRoute ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : isBookshelf ? (
      <Bookshelf />
    ) : isAccount ? (
      <AccountPage />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
