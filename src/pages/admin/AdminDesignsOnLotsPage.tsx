import AdminResourcePage from "./AdminResourcePage";
import { adminApi } from "@/lib/api/adminApi";

const AdminDesignsOnLotsPage = () => (
  <AdminResourcePage
    title="Designs On Lots"
    loader={() => adminApi.getDesignsOnLots()}
  />
);

export default AdminDesignsOnLotsPage;

