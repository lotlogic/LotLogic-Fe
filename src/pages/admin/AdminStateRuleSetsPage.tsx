import { AdminNav } from "@/components/admin/AdminNav";
import { StateRuleSetsCrud } from "@/components/admin/state-rules/StateRuleSetsCrud";
import { adminAuth } from "@/lib/auth/adminAuth";
import { Button } from "@/components/ui/Button";

const AdminStateRuleSetsPage = () => {
  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">State Rule Sets</h1>
      <AdminNav />
      <div className="flex flex-wrap gap-2 mb-6 mt-4">
        <Button onClick={handleLogout} variant="outline" label="Sign out" />
      </div>
      <StateRuleSetsCrud />
    </div>
  );
};

export default AdminStateRuleSetsPage;
