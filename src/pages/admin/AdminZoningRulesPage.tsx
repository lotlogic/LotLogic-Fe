import AdminResourcePage from "./AdminResourcePage";
import { adminApi } from "@/lib/api/adminApi";

const AdminZoningRulesPage = () => (
  <AdminResourcePage
    title="Zoning Rules"
    loader={() => adminApi.getZoningRules()}
  />
);

export default AdminZoningRulesPage;

