import AdminResourcePage from "./AdminResourcePage";
import { adminApi } from "@/lib/api/adminApi";

const AdminFloorPlansPage = () => (
  <AdminResourcePage
    title="Floor Plans"
    loader={() => adminApi.getFloorPlans()}
  />
);

export default AdminFloorPlansPage;

