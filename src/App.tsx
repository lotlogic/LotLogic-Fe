import { APIProvider } from "@vis.gl/react-google-maps";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect } from "react";
import HomePage from "./pages/Home";
import NotFoundPage from "./pages/NotFoundPage";
import PrototypePage from "./pages/PrototypePage";
import { RequireAdminAuth } from "./components/auth/RequireAdminAuth";
import { RequireAdminRole } from "./components/auth/RequireAdminRole";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminEstatesPage from "./pages/admin/AdminEstatesPage";
import AdminEstatePage from "./pages/admin/AdminEstatePage";
import AdminLotsPage from "./pages/admin/AdminLotsPage";
import AdminZoningRulesPage from "./pages/admin/AdminZoningRulesPage";
import AdminLotZoningRulesPage from "./pages/admin/AdminLotZoningRulesPage";
import AdminFloorPlansPage from "./pages/admin/AdminFloorPlansPage";
import AdminFacadesPage from "./pages/admin/AdminFacadesPage";
import AdminDesignsOnLotsPage from "./pages/admin/AdminDesignsOnLotsPage";
import AdminBuildersPage from "./pages/admin/AdminBuildersPage";
import AdminBuilderPage from "./pages/admin/AdminBuilderPage";
import AdminBrandSettingsPage from "./pages/admin/AdminBrandSettingsPage";
import AdminBrandSettingPage from "./pages/admin/AdminBrandSettingPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import DashboardBuilderPage from "./pages/dashboard/DashboardBuilderPage";
import DashboardEstatePage from "./pages/dashboard/DashboardEstatePage";
import {
  applyBrandTheme,
  clearBrandThemeOverrides,
  loadBrandFonts,
} from "./lib/theme/brandTheme";

const BrandThemeController = () => {
  const location = useLocation();

  useEffect(() => {
    if (
      location.pathname.startsWith("/admin") ||
      location.pathname.startsWith("/dashboard")
    ) {
      clearBrandThemeOverrides();
    } else {
      loadBrandFonts();
      applyBrandTheme();
    }
  }, [location.pathname]);

  return null;
};

const AdminGate = ({ children }: { children: ReactNode }) => (
  <RequireAdminAuth>
    <RequireAdminRole>{children}</RequireAdminRole>
  </RequireAdminAuth>
);

function App() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <Router>
        <BrandThemeController />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/prototype" element={<PrototypePage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAdminAuth>
                <DashboardPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/dashboard/builders/:builderId"
            element={
              <RequireAdminAuth>
                <DashboardBuilderPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/dashboard/estates/:estateId"
            element={
              <RequireAdminAuth>
                <DashboardEstatePage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminGate>
                <Navigate to="/admin/users" replace />
              </AdminGate>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminGate>
                <AdminUsersPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/estates"
            element={
              <AdminGate>
                <AdminEstatesPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/estates/:estateId"
            element={
              <AdminGate>
                <AdminEstatePage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/lots"
            element={
              <AdminGate>
                <AdminLotsPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/zoning-rules"
            element={
              <AdminGate>
                <AdminZoningRulesPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/lot-zoning-rules"
            element={
              <AdminGate>
                <AdminLotZoningRulesPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/floor-plans"
            element={
              <AdminGate>
                <AdminFloorPlansPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/facades"
            element={
              <AdminGate>
                <AdminFacadesPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/design-on-lots"
            element={
              <AdminGate>
                <AdminDesignsOnLotsPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/builders"
            element={
              <AdminGate>
                <AdminBuildersPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/builders/:builderId"
            element={
              <AdminGate>
                <AdminBuilderPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/brand-settings"
            element={
              <AdminGate>
                <AdminBrandSettingsPage />
              </AdminGate>
            }
          />
          <Route
            path="/admin/brand-settings/:guid"
            element={
              <AdminGate>
                <AdminBrandSettingPage />
              </AdminGate>
            }
          />
        </Routes>
      </Router>
    </APIProvider>
  );
}

export default App;
