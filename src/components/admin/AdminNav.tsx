import { Link, useLocation } from "react-router-dom";
import { useAdminSession } from "@/lib/admin/adminSession";

const adminLinks: Array<{
  to: string;
  label: string;
  requiresAdmin?: boolean;
}> = [
  { to: "/admin/users", label: "Users", requiresAdmin: true },
  { to: "/admin/estates", label: "Estates" },
  { to: "/admin/lots", label: "Lots" },
  { to: "/admin/zoning-rules", label: "Zoning Rules" },
  { to: "/admin/lot-zoning-rules", label: "Lot Zoning Rules" },
  { to: "/admin/floor-plans", label: "Floor Plans" },
  { to: "/admin/facades", label: "Facades" },
  { to: "/admin/design-on-lots", label: "Designs On Lots" },
  { to: "/admin/builders", label: "Builders" },
  { to: "/admin/brand-settings", label: "Brand Settings" },
];

export const AdminNav = () => {
  const location = useLocation();
  const { role } = useAdminSession();
  const isAdmin = role === "ADMIN";

  return (
    <nav className="flex flex-wrap gap-2 mb-4">
      {adminLinks
        .filter((link) => !link.requiresAdmin || isAdmin)
        .map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`
                px-2.5 py-1.5 rounded-md border text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-slate-200 border-slate-300 text-slate-900"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
              `}
            >
              {link.label}
            </Link>
          );
        })}
    </nav>
  );
};
