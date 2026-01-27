import AdminResourcePage from "./AdminResourcePage";
import { adminApi } from "@/lib/api/adminApi";

const AdminBuildersPage = () => (
  <AdminResourcePage title="Builders" loader={() => adminApi.getBuilders()} />
);

export default AdminBuildersPage;

