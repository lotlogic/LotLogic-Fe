import AdminResourcePage from "./AdminResourcePage";
import { adminApi } from "@/lib/api/adminApi";

const AdminLotZoningRulesPage = () => (
  <AdminResourcePage
    title="Lot Zoning Rules"
    loader={() => adminApi.getLotZoningRules()}
  />
);

export default AdminLotZoningRulesPage;

