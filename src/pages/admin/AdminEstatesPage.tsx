import AdminResourcePage from "./AdminResourcePage";
import { adminApi } from "@/lib/api/adminApi";

const AdminEstatesPage = () => (
  <AdminResourcePage title="Estates" loader={() => adminApi.getEstates()} />
);

export default AdminEstatesPage;

