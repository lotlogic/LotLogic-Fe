import { APIProvider } from "@vis.gl/react-google-maps";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import HomePage from "./pages/Home";
import NotFoundPage from "./pages/NotFoundPage";
import PrototypePage from "./pages/PrototypePage";
import { RequireAdminAuth } from "./components/auth/RequireAdminAuth";
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
import {
  applyBrandTheme,
  clearBrandThemeOverrides,
  loadBrandFonts,
} from "./lib/theme/brandTheme";

const BrandThemeController = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) {
      clearBrandThemeOverrides();
    } else {
      loadBrandFonts();
      applyBrandTheme();
    }
  }, [location.pathname]);

  return null;
};

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
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route
            path="/admin/users"
            element={
              <RequireAdminAuth>
                <AdminUsersPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/estates"
            element={
              <RequireAdminAuth>
                <AdminEstatesPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/estates/:estateId"
            element={
              <RequireAdminAuth>
                <AdminEstatePage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/lots"
            element={
              <RequireAdminAuth>
                <AdminLotsPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/zoning-rules"
            element={
              <RequireAdminAuth>
                <AdminZoningRulesPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/lot-zoning-rules"
            element={
              <RequireAdminAuth>
                <AdminLotZoningRulesPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/floor-plans"
            element={
              <RequireAdminAuth>
                <AdminFloorPlansPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/facades"
            element={
              <RequireAdminAuth>
                <AdminFacadesPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/design-on-lots"
            element={
              <RequireAdminAuth>
                <AdminDesignsOnLotsPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/builders"
            element={
              <RequireAdminAuth>
                <AdminBuildersPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/builders/:builderId"
            element={
              <RequireAdminAuth>
                <AdminBuilderPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/brand-settings"
            element={
              <RequireAdminAuth>
                <AdminBrandSettingsPage />
              </RequireAdminAuth>
            }
          />
          <Route
            path="/admin/brand-settings/:guid"
            element={
              <RequireAdminAuth>
                <AdminBrandSettingPage />
              </RequireAdminAuth>
            }
          />
        </Routes>
      </Router>
    </APIProvider>
  );
}

export default App;
