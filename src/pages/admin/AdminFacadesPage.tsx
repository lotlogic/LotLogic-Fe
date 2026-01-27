import AdminResourcePage from "./AdminResourcePage";
import { adminApi } from "@/lib/api/adminApi";

const AdminFacadesPage = () => (
  <AdminResourcePage title="Facades" loader={() => adminApi.getFacades()} />
);

export default AdminFacadesPage;

