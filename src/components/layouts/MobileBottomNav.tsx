import { Bookmark, Navigation, Search } from "lucide-react";

interface MobileBottomNavProps {
  activeTab?: "search" | "saved" | "recenter" | null;
  onTabChange?: (tab: "search" | "saved" | "recenter") => void;
}

export const MobileBottomNav = ({
  activeTab = null,
  onTabChange,
}: MobileBottomNavProps) => {
  const tabs = [
    { id: "search", icon: Search, label: "Search" },
    { id: "saved", icon: Bookmark, label: "Saved" },
    { id: "recenter", icon: Navigation, label: "Recenter" },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-brand border-t border-brand z-50">
      <div className="flex items-center justify-around px-4 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? "text-brand-primary bg-brand-muted"
                  : "text-brand-muted hover:text-brand"
              }`}
              aria-label={tab.label}
            >
              <Icon
                className={`h-5 w-5 ${
                  isActive ? "text-brand-primary" : "text-brand-muted"
                }`}
              />
              <span
                className={`text-xs mt-1 ${
                  isActive ? "text-brand-primary" : "text-brand-muted"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
