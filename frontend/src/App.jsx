import { lazy, Suspense } from "react";
import LandingPage from "./components/LandingPage";

// /admin is a separate screen (login-protected); loaded only when visited.
const AdminPage = lazy(() => import("./components/AdminPage"));

const App = () =>
  window.location.pathname.replace(/\/+$/, "").startsWith("/admin") ? (
    <Suspense fallback={null}>
      <AdminPage />
    </Suspense>
  ) : (
    <LandingPage />
  );

export default App;
