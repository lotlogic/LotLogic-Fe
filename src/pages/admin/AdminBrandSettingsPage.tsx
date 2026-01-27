import AdminResourcePage from "./AdminResourcePage";
import { adminApi } from "@/lib/api/adminApi";

const AdminBrandSettingsPage = () => (
  <AdminResourcePage
    title="Brand Settings"
    loader={() => adminApi.getBrandSettings()}
  />
);

export default AdminBrandSettingsPage;

