import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { adminAuth } from "@/lib/auth/adminAuth";
import { useAdminSession } from "@/lib/admin/adminSession";
import { Button } from "@/components/ui/Button";

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const dashboardLinks: Array<{ to: string; label: string }> = [
  { to: "/dashboard", label: "Dashboard" },
];

export const DashboardLayout = ({
  title,
  subtitle,
  actions,
  children,
}: DashboardLayoutProps) => {
  const location = useLocation();
  const { role } = useAdminSession();
  const isAdmin = role?.toUpperCase() === "ADMIN";

  const links = isAdmin
    ? [...dashboardLinks, { to: "/admin", label: "Admin" }]
    : dashboardLinks;

  const handleLogout = async () => {
    await adminAuth.logout();
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button onClick={handleLogout} variant="outline" label="Sign out" />
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-6">
        {links.map((link) => {
          const isActive =
            location.pathname === link.to ||
            location.pathname.startsWith(`${link.to}/`);
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

      {children}
    </div>
  );
};

export default DashboardLayout;
