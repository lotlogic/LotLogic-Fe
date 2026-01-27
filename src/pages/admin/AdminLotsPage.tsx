import AdminResourcePage from "./AdminResourcePage";
import { adminApi } from "@/lib/api/adminApi";

const AdminLotsPage = () => (
  <AdminResourcePage title="Lots" loader={() => adminApi.getLots()} />
);

export default AdminLotsPage;

